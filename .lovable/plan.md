# Fix Google OAuth + Add One-Click Google Sign-In

## What's actually broken

The screenshot shows `barberhub.tv/auth/callback#access_token=...` returning a Vercel **404 NOT_FOUND** (the `iad1::` ID and styling are Vercel's). The React route `/auth/callback` exists in `App.tsx`, but Vercel isn't serving `index.html` for unknown deep paths — so the SPA never loads, the token never gets parsed, and Supabase never creates a session. That's why no email/account ever shows up.

This is a **hosting config issue**, not an auth code issue. The same flow works in the Lovable preview (where SPA fallback is automatic) but fails on `barberhub.tv`.

## Plan

### 1. Add Vercel SPA rewrite (fixes the 404)

Create `vercel.json` at the project root:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This makes Vercel serve `index.html` for `/auth/callback`, `/reset-password`, and every other client route. After redeploy, the existing `AuthCallback.tsx` page picks up the hash and signs the user in.

### 2. Verify Supabase Google provider redirect URLs

In the Supabase dashboard (Auth → URL Configuration), make sure both are listed under **Redirect URLs**:
- `https://barberhub.tv/auth/callback`
- `https://barberhub.tv/**`

And **Site URL** = `https://barberhub.tv`. (User said redirects are already pasted — I'll just confirm via instructions; this is dashboard work, not code.)

### 3. Add Google One Tap — true one-click signup

To capture leads with the lowest possible friction, add Google One Tap on top of the existing OAuth button. When a user has a Google session in their browser, a small prompt appears auto-suggesting their Google account — one tap and they're signed in, no redirect, no extra page.

**New file**: `src/components/auth/GoogleOneTap.tsx`
- Loads `https://accounts.google.com/gsi/client` script once.
- Calls `google.accounts.id.initialize` with the Google Web Client ID and a nonce.
- Calls `google.accounts.id.prompt()` to surface the One Tap UI.
- On credential callback, calls `supabase.auth.signInWithIdToken({ provider: 'google', token: credential, nonce })`.
- Skips itself when a Supabase session already exists.
- Stashes the same `raffle_pending_claim` payload that `StepClaimAccount` writes, so the raffle ticket still attaches if the user one-taps mid-funnel.

**New env var**: `VITE_GOOGLE_CLIENT_ID` (added to `.env`). User provides the Web Client ID from the same Google Cloud OAuth credential that Supabase already uses. No secret needed — this is the public client ID.

**Mount points**:
- `src/pages/ComingSoon.tsx` — render `<GoogleOneTap />` so visitors get a one-tap prompt before they even start the funnel.
- `src/components/coming-soon/StepClaimAccount.tsx` — render it on the final step too, so users who reached the spin still get a one-tap option above the existing buttons.

**Updated lead-capture wiring**:
When One Tap fires before the user has an email registered, the `register-lead` flow runs server-side from a new tiny `src/hooks/useOneTapLeadCapture.ts` that, on successful sign-in, calls the existing `register-lead` and `link-raffle-to-user` edge functions with the user's Google email. This guarantees the lead row exists even when the user skipped the email step entirely.

### 4. Tighten the OAuth button fallback

In `StepClaimAccount.tsx`, the existing "Continue with Google" button stays as the fallback for users where One Tap doesn't render (Safari with strict ITP, incognito, browsers without a Google session). No behavioral change — only a tiny copy tweak: rename to "Sign up with Google — 1 click" so it visually matches the new aesthetic.

## Technical details

```text
User journey (Google One Tap, happy path)
─────────────────────────────────────────
visit barberhub.tv
   │
   ▼
GoogleOneTap mounts → google.accounts.id.prompt()
   │
   ▼
User taps their Google account chip
   │
   ▼
Google returns id_token (JWT) → supabase.auth.signInWithIdToken
   │
   ▼
Session created in-place (NO redirect, NO email)
   │
   ▼
useOneTapLeadCapture: register-lead({email}) + link-raffle-to-user
   │
   ▼
User is signed in + raffle ticket attached
```

```text
User journey (classic OAuth, after fix)
─────────────────────────────────────────
Click "Continue with Google"
   │
   ▼
Redirect to accounts.google.com
   │
   ▼
Redirect to barberhub.tv/auth/callback#access_token=…
   │
   ▼  (was 404 — now works because of vercel.json)
AuthCallback.tsx parses hash → onAuthStateChange fires SIGNED_IN
   │
   ▼
Navigate to "/" → user is in
```

### Files touched

- **Created**: `vercel.json`
- **Created**: `src/components/auth/GoogleOneTap.tsx`
- **Created**: `src/hooks/useOneTapLeadCapture.ts`
- **Edited**: `src/pages/ComingSoon.tsx` (mount `<GoogleOneTap />`)
- **Edited**: `src/components/coming-soon/StepClaimAccount.tsx` (mount One Tap above existing buttons + copy tweak)
- **Edited**: `.env` (add `VITE_GOOGLE_CLIENT_ID` placeholder)

### What I'll need from you after I implement

1. **Redeploy `barberhub.tv` on Vercel** so `vercel.json` takes effect. Without redeploy, the 404 stays.
2. **Paste your Google Web Client ID** (from Google Cloud → APIs & Services → Credentials → the OAuth 2.0 Web client you already use for Supabase). I'll set it in `VITE_GOOGLE_CLIENT_ID`. If you'd rather, just tell me when you've pasted it into `.env` and I'll proceed without seeing the value.
3. In Google Cloud, under that OAuth client, make sure **Authorized JavaScript origins** includes `https://barberhub.tv` (One Tap requires this — it's separate from the redirect URI).

Once you approve, I'll make all the code changes in one pass.
