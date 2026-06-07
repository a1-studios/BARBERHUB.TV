## Simple OTP Auth + Post-Signup Profile Completion

### What changes for the user
- The landing page becomes a clean, minimal sign-up/sign-in screen. One field: email or phone. We send a 6-digit code. No "Spin to Win", no multi-step wizard.
- Everyone starts as a Fan automatically.
- After signing in, a small popup asks them to pick their role (Fan or Barber) and country. If they choose Barber, a phone number becomes required to activate the barber profile.
- Everything is saved to the existing Supabase `profiles` table (and `barber_profiles` when applicable).

### Files I will edit
1. **`src/components/LandingHero.tsx`** — Remove the "Join & Get 15 BB" button that opens the spin wizard. Replace with a single primary CTA that opens the existing email/phone OTP modal (`AuthModalV2`). Keep the signature header, tagline, and stats.
2. **`src/pages/Index.tsx`** — For guests, render just `<LandingHero />`. Remove the `showSpinWheel` state, the `check-gate-eligibility` effect, `handleSpinClose`, and the `<LaunchWizard>` render. Authed-user behavior unchanged.
3. **`src/components/auth/ProfileCompletionGate.tsx`** — Make the phone field required when role is Barber. Update the placeholder and disable submit until it's filled. Fan path stays as-is.

### Database
- `profiles` already stores `user_type` and `country_code`, and the `handle_new_user` trigger already defaults new users to `fan`. No schema changes needed unless `profiles.phone_number` is missing — if so, I'll add it with a tiny migration:
  ```sql
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;
  ```
- The existing `finalize-oauth-claim` edge function already writes role / country / phone and upgrades barbers — reused unchanged.

### Out of scope
- `LaunchWizard`, spin wheel, gate eligibility function — left in the repo, just no longer invoked from the landing page. Can be deleted in a follow-up if you want.
- `AuthModalV2` already does email + phone OTP correctly — no edits.

Approve and I'll ship it.