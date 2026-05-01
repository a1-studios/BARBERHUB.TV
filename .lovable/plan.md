## What's still broken

You pasted the redirect URLs into Supabase (good — `https://barberhub.tv/**` is now in the allowlist). But the **old confirmation emails already in your inbox** still won't work, because Supabase baked the `redirectTo` into them at send time — and at that time it was the bare Site URL `https://barberhub.tv/`, not `/auth/callback`.

When you click "Activate Account" in those old emails, Supabase verifies the token and redirects to:

```
https://barberhub.tv/#access_token=...&refresh_token=...&type=signup
```

That lands on the **home page**, which has no logic to process the hash. The SDK silently consumes the token, you stay on the home screen, and the next sign-in attempt returns "Email not confirmed" because the token is now spent.

## Fix: a tiny safety net component

Add one small mounted-once component that watches every route for a Supabase auth hash and forwards the user to `/auth/callback` (or `/reset-password` for recovery), preserving the hash. After this, **even old emails that point at `/` will work** — the hash gets caught and handled.

### Files

| File | Change |
|---|---|
| `src/components/auth/AuthHashHandler.tsx` | **Create** — listens for `#access_token=...` / `type=signup` / `type=recovery` etc. on any route and redirects to the right callback page |
| `src/App.tsx` | Mount `<AuthHashHandler />` once inside `<BrowserRouter>` (one import + one line) |

### How `AuthHashHandler` works

```text
On every route change:
  Read window.location.hash
  If hash contains access_token / type=signup / type=recovery / error_code:
    If already on /auth/callback or /reset-password → do nothing
    If type=recovery → navigate('/reset-password' + hash, replace)
    Else → navigate('/auth/callback' + hash, replace)
```

`AuthCallback.tsx` already handles the rest: shows the spinner, listens for `SIGNED_IN`, shows the "Account Confirmed" success screen, redirects home. On error/expired token, it surfaces the "Resend confirmation" form.

### Why this is safe

- Mounted at the app root → covers `Index`, `ComingSoon`, and every other page.
- Only fires when a Supabase-shaped hash is present — won't interfere with normal navigation, anchor links, or LiveKit/video URL fragments.
- Uses `replace: true` so the auth hash doesn't pollute browser history.
- If the user is already on the correct page, it no-ops (so direct clicks on freshly-issued `/auth/callback` links continue to work exactly as today).

## After this is in

1. Click "Activate Account" in any branded email (old or new) → success screen → signed in → home.
2. Click "Reset Password" in the recovery email → `/reset-password` form → set new password.
3. If a token is already expired/used, the AuthCallback page shows the "Resend confirmation email" form so you're never stuck.

Reply **"approve"** and I'll implement just these two changes.