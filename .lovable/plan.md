## What's broken

The signup is succeeding (`/signup` returns 200 in auth logs) and Supabase IS sending the confirmation email — but it's going out from `noreply@mail.app.supabase.io` (Supabase's default mailer), which has aggressive rate limits and frequently lands in spam.

Evidence:
- Auth log shows `mail_from: noreply@mail.app.supabase.io` (default mailer, not your branded hook)
- `auth-email-hook` edge function has **zero invocations** in its logs
- The hook code and `supabase/config.toml` entry exist, but the function was never successfully deployed to Supabase, so Lovable's orchestrator never activated it as the auth email handler

The `notify.barberhub.tv` domain itself is **verified ✅** — DNS is fine. The problem is purely that the hook isn't live yet.

## Fix

### 1. Deploy `auth-email-hook` to Supabase
Trigger an explicit deploy of the function. Once it deploys successfully, the Lovable email orchestrator automatically wires it into Supabase Auth's email pipeline, replacing the default `noreply@mail.app.supabase.io` sender with `BarberHub <noreply@barberhub.tv>`.

### 2. Verify activation
After deploy:
- Confirm the function appears in Supabase's deployed functions list
- Check that the next signup attempt invokes `auth-email-hook` (logs should show activity)
- Confirm the user receives a branded email from `noreply@barberhub.tv`

### 3. Add "Resend confirmation email" affordance in `StepLiveFinalize.tsx`
Right now if a user doesn't get the email, they're stuck on Step 4 with no recovery path. Add:
- A "Didn't get the email? Resend" button that calls `supabase.auth.resend({ type: 'signup', email })`
- A 30-second cooldown on the button to avoid hammering the rate limit
- A "Check spam folder" hint below the button
- Optional: a small "change email" link that takes them back to Step 3

### 4. Smoke test
Sign up with a fresh email, confirm:
- Email arrives from `noreply@barberhub.tv` (not `mail.app.supabase.io`)
- Branded BarberHub orange-on-white template renders
- Confirmation link successfully signs the user in
- Pending prize is claimed on first sign-in

## Files touched

- `supabase/functions/auth-email-hook/index.ts` — deploy only, no code changes (already correctly written)
- `src/components/coming-soon/StepLiveFinalize.tsx` — add resend button + cooldown + spam hint

## Why the previous setup didn't fully work

Scaffolding the templates created the files, but the deploy step didn't successfully register the function with Supabase Auth's webhook system. The system contract requires `auth-email-hook` to be deployed before Lovable can flip Supabase from "use default emails" to "call this webhook for every auth email." Until that switch flips, every signup email goes out via the default mailer regardless of how nicely your templates are styled.
