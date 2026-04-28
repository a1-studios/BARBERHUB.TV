
# Make Confirm + Reset Password Links Work

**Scope:** Only fix the broken email links. No template redesign, no SMTP or deliverability changes. Spam triage comes after this works.

---

## Why links are silently failing today

Two concrete causes — both small, both safe to fix:

### 1. Signup confirm link has no landing page
The signup email's button points to `{{ .ConfirmationURL }}`, which Supabase builds from your **Site URL** (`https://barberhub.tv`) + a hash like `#access_token=...&type=signup`. Today that hash arrives at `/` (the landing page), and **nothing on `/` reads the hash**. The Supabase SDK silently consumes the token in the background, you land on the homepage, the token is now spent, and the next sign-in attempt returns the exact error your auth logs show: `400: Email not confirmed`.

There is no `/auth/callback` route registered in `App.tsx`, and `signUp()` in `useAuth.tsx` sets `emailRedirectTo: ${origin}/` — so there's no page actively finalizing the confirmation.

### 2. Reset password link works in theory but breaks across environments
`/reset-password` exists and is correct. The problem: the email is built from production `site_url = https://barberhub.tv`, so when you click the link while testing on `localhost:3000` or the Lovable preview, you're sent to production — a different browser session with no recovery context, and clicking again returns "expired" because the token was already consumed by the first redirect.

---

## The Fix (small, surgical)

### A. Add a real confirm-handler page

**Create `src/pages/AuthCallback.tsx`** — a tiny page that:
- Listens for `SIGNED_IN` / checks the URL hash on mount.
- On success: shows "Account confirmed ✓" for ~1 sec, then routes to `/`.
- On failure (expired/invalid): shows the error and a **"Resend confirmation email"** button that calls `supabase.auth.resend({ type: 'signup', email })`.
- Same visual style as `ResetPassword.tsx` so it feels consistent.

**Register it in `src/App.tsx`** at `/auth/callback` (public route, no AuthGuard).

### B. Point new signups at that page

**In `src/hooks/useAuth.tsx`**, change one line:
```
emailRedirectTo: `${window.location.origin}/auth/callback`
```
(currently `${window.location.origin}/`). This affects **only new signups going forward** — existing pending confirmation emails will continue to land on `/` (still harmless; they just won't show a success screen).

### C. Whitelist the new redirect target

**In `supabase/config.toml`**, add the `/auth/callback` and `/reset-password` variants to `additional_redirect_urls` so Supabase accepts redirects to them across all environments (prod, www, lovable preview, localhost). Site URL stays `https://barberhub.tv`.

### D. Recover the user when they hit "Email not confirmed"

**In the sign-in form** (`src/components/auth/AuthDialog.tsx` or wherever sign-in lives — I'll find it), when Supabase returns `email_not_confirmed`, surface a small **"Resend confirmation email"** link right under the password field that calls `supabase.auth.resend({ type: 'signup', email })`. This is the missing escape hatch from the loop you've been stuck in.

---

## What does NOT change

- ❌ No edits to email template HTML files
- ❌ No SMTP / Resend / sender-address changes
- ❌ No edge function changes
- ❌ No spam / deliverability work
- ❌ No `site_url` change (stays `https://barberhub.tv`)
- ❌ Reset password page (`/reset-password`) is already correct — left alone

---

## Files touched

| File | Change |
|---|---|
| `src/pages/AuthCallback.tsx` | **Create** |
| `src/App.tsx` | Add 1 route line |
| `src/hooks/useAuth.tsx` | Change `emailRedirectTo` (1 line) |
| `src/components/auth/AuthDialog.tsx` (or sign-in component) | Add "Resend confirmation" link on `email_not_confirmed` error |
| `supabase/config.toml` | Add 8 entries to `additional_redirect_urls` |

---

## After deploy — your verification (2 minutes)

1. Sign up with a fresh email → click "Activate Account" → should land on `/auth/callback` showing success → can sign in normally.
2. Click "Forgot Password" with an existing account → click "Reset Password" link → should land on `/reset-password` and let you set a new password.
3. If a confirm link from **before** this fix is stuck, just sign in once with that email/password — the new "Resend confirmation" link will appear and email a fresh link that uses the new flow.

Reply **"approve"** and I'll implement just these 5 changes.
