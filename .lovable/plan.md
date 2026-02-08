

## Fix: BB Balance Not Updating After Purchase

### Root Cause

The `/payment-success` route is **not wrapped in AuthGuard** and the `PaymentSuccess` component does not wait for authentication to restore before calling the `verify-bb-purchase` edge function.

Here is what happens:

```text
1. User clicks a BB package in AddFundsModal
2. window.location.href redirects to Stripe checkout (full page unload)
3. User completes payment on Stripe
4. Stripe redirects back to /payment-success?session_id=xxx&type=bb
5. App reloads from scratch -- auth session restoring from localStorage (async)
6. PaymentSuccess useEffect fires IMMEDIATELY (sessionId is available from URL)
7. supabase.functions.invoke('verify-bb-purchase') is called WITHOUT auth token
8. Edge function rejects: "Missing authorization header"
9. BB is never credited -- balance stays at 0
```

The auth session restoration is asynchronous, but the `useEffect` has no dependency on auth state. It fires before the Supabase client has restored the session from localStorage.

### Fix

#### 1. PaymentSuccess.tsx -- Wait for Auth Before Verifying

- Import and use `useAuth()` hook to access `user` and `loading` state
- Add `user` and `loading` as dependencies to the verification `useEffect`
- Only call `verifyBbPurchase()` once `loading === false` and `user` is present
- Show a loading spinner while auth is restoring
- Handle the edge case where auth never loads (session expired) with a clear message and retry option

#### 2. verify-bb-purchase Edge Function -- Add Resilient Auth Fallback

As an extra safety net, make the edge function handle missing auth gracefully:
- If the auth header is present, verify the user matches the Stripe session metadata (current behavior)
- If the auth header is missing, still allow verification but rely entirely on the Stripe session's `user_id` metadata for crediting
- This ensures that even if there is a timing issue, the purchase can still be completed

This does not compromise security because:
- The Stripe session ID is a secret known only to the paying user
- The `user_id` in the session metadata was set during checkout creation (by the server, not the client)
- Idempotency check prevents any double-crediting

### Changes

| File | Change |
|------|--------|
| `src/pages/PaymentSuccess.tsx` | Import `useAuth`, wait for auth loading to complete before calling verify; add loading/error states for auth restoration |
| `supabase/functions/verify-bb-purchase/index.ts` | Make auth optional -- if auth header present, verify user match; if absent, trust Stripe session metadata for user_id |

### Updated PaymentSuccess Flow

```text
1. App reloads after Stripe redirect
2. PaymentSuccess mounts, shows "Restoring session..." spinner
3. Auth provider restores session from localStorage (takes ~200-500ms)
4. useEffect detects: loading=false, user=present, sessionId=present
5. Calls verify-bb-purchase WITH valid auth token
6. Edge function verifies Stripe session, credits BB, returns new balance
7. UI shows "+X BB Credited" with new balance
8. Query cache invalidated -- header BB widget updates immediately
```

