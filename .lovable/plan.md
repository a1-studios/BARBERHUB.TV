## Problem

Signup emails arrive, but neither path completes:

1. **Email button** sends users to `https://msuepyfssovvkjzpfjzu.supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=https://barberhub.tv/auth/callback`. Supabase redirects to `/auth/callback?code=...` (PKCE), but `AuthCallback.tsx` only listens for an existing session or hash tokens — it never calls `supabase.auth.exchangeCodeForSession(code)`. After 6s the page shows "Link Expired".
2. **6-digit code** in the email has nowhere to be entered on the site.

Auth logs confirm `/otp` returns 200 (email is sent correctly), so the only gap is on the client.

## Fix

### 1. `src/pages/AuthCallback.tsx` — handle the `?code=` flow
- On mount, read `?code=` from `window.location.search`.
- If present, call `supabase.auth.exchangeCodeForSession(code)`.
  - Success → existing `onAuthStateChange('SIGNED_IN')` already fires → success UI + redirect to `/`.
  - Error → set `status='error'` with the returned message and keep the resend form.
- Keep the existing hash-token / `getSession()` fallback for older links.
- Bump the hard timeout from 6s to 10s so a slow exchange doesn't false-fail.

### 2. Add a code-entry fallback on the same `/auth/callback` page
- In the `error` branch (and also reachable via a small "Have a code?" toggle in the `verifying` branch), show an OTP input:
  - Email field (prefilled from `localStorage.raffle_pending_claim.email` if present, else manual).
  - 6-digit code field (numeric, autoComplete="one-time-code").
  - Submit calls `supabase.auth.verifyOtp({ email, token, type: 'email' })`.
  - Success → same SIGNED_IN handler completes the flow.
- Reuse existing cyber-styled inputs/buttons; no new design system tokens.

### 3. Make the email's code box land users in the right place
- Update `supabase/auth-email-templates/confirm-signup.html`:
  - Above the `{{ .Token }}` block, change the "Or use this code" line to read: "Or enter this code at https://barberhub.tv/auth/callback".
  - Wrap the code box in an anchor to `https://barberhub.tv/auth/callback` so tapping it opens the page where the input now exists.
- No other template/branding changes.

## Out of scope

- No DB migrations, no edge function changes, no Supabase Auth setting changes.
- No changes to `StepClaimAccount.tsx` (it already uses `signInWithOtp` with the correct `emailRedirectTo`).
- No changes to OAuth/social login or password reset flow.

## Technical notes

- `exchangeCodeForSession` is the supported call for Supabase's PKCE `?code=` redirects in `@supabase/supabase-js` v2.
- `verifyOtp({ type: 'email' })` is the correct type for the 6-digit token emitted by `{{ .Token }}` in a signup/magic-link email (works for both signup confirm and magic link).
- The existing `AuthHashHandler` already routes stray `#access_token=` hashes to `/auth/callback`, so the new logic covers all three delivery modes (hash, code, OTP) in one place.
