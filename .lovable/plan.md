## Root causes (verified in code)

1. **Email path "Edge Function returned non-2xx"** — `register-lead` returns **409 `already_entered`** whenever the email already exists in `raffle_entries`. Re-entering the same address (or any retry after a prior attempt) throws the red error box you saw on `dexterloko6@gmail.com`. This is what's actually breaking the email flow — it is not the auth signup itself.
2. **Google One‑Click skips role pick** — `LaunchWizard.tsx` lines 65–82: `onAuthStateChange` jumps OAuth users straight from step 1 → step 3 (spin), defaulting `role` to `'fan'` if unset. The role step is bypassed entirely.
3. **Fragmented intake** — Current order is Email/OAuth → Role → Spin → Claim. Role is captured *after* auth for OAuth users, and the "claim" screen at the end is a dead, dull state.

## New unified flow (role-first, binary)

```
STEP 1  Role pick (Barber | Fan)     ──►  saved to sessionStorage
STEP 2  Auth (Google / Apple / Meta / Email magic link)
                  │           role bundled in user_metadata
                  ▼
STEP 3  "+15 Barber Bucks" celebration modal (confetti + Claim & Continue)
STEP 4  Spin the Vault (tap-to-spin, 3–4s ease-out → ticket reveal)
STEP 5  Ticket reveal ("Save My Ticket" → home)
```

Role is the **first** screen for everyone. OAuth and email both carry `user_type` in `auth.signUp/signInWithOtp` `options.data`, so the existing `handle_new_user` trigger writes the correct profile row on first session.

## Changes

### Phase 1 — Logic restructure (role-first)

- **`src/components/coming-soon/LaunchWizard.tsx`**
  - Reorder steps: `1 = StepRole`, `2 = StepIdentityHook (auth)`, `3 = BBCelebration`, `4 = StepRaffleSpin`, `5 = TicketReveal`. Bump `TOTAL_STEPS` to 5.
  - Persist `{role, barberStatus, country, phone}` to `sessionStorage('bh_pending_role')` the instant the user picks.
  - Replace the OAuth auto-jump effect: on `SIGNED_IN`, read the pending role from sessionStorage, then advance to step 3 (celebration), **not** step 3 (old spin). If no role found (edge case: user landed mid-flow from an old link), route them through the role step first before continuing.
  - Remove the implicit `role: s.role ?? 'fan'` default.
- **`src/components/coming-soon/StepRole.tsx`** — already exists; reuse as-is, just wire as first step. Drop the email prop dependency.
- **`src/components/coming-soon/StepIdentityHook.tsx`**
  - Now step 2. Receives `role` + `country` props. Passes them into both flows:
    - `signInWithOAuth({ options: { queryParams, redirectTo, ... } })` — role is already in sessionStorage; `AuthCallback` + `finalize-oauth-claim` will read it.
    - `signInWithOtp({ options: { data: { user_type: role, country_code, ... }, emailRedirectTo }})` — bundles role directly.
  - **Stop calling `register-lead` here.** Move lead registration into `submit-role-details` (email path) and `finalize-oauth-claim` (OAuth path), both already exist post-auth. This removes the 409 trap entirely from the pre-auth UI.
- **`supabase/functions/register-lead/index.ts`**
  - Change the duplicate-email branch from `409 already_entered` to **`200 { ok: true, already: true }`** so any remaining callers don't error. Keep idempotent upsert on `marketing_leads`.
- **`src/pages/AuthCallback.tsx`** — on `SIGNED_IN`, if `sessionStorage.bh_pending_role` exists and the new profile's `user_type` is null/mismatched, call `finalize-oauth-claim` with the role so the OAuth user lands with the right binary role. Then redirect to `/?onboard=resume` so `Index` re-opens the wizard at the celebration step.

### Phase 2 — First Dopamine Hit (`+15 BB`)

- **New: `src/components/coming-soon/StepBucksReward.tsx`**
  - Full-bleed celebratory card: large 3D BB coin (reuse `BBCoin` if available, else SVG), animated counter `0 → 15`, confetti burst (lightweight inline canvas, no new dep), copy: *"Welcome to the Hub! You've just earned 15 Barber Bucks."*, single CTA `CLAIM & CONTINUE`.
  - On click → call existing edge function (or new `award-signup-bonus` — see backend note) to credit 15 BB to `barber_bucks_wallet`, then `goNext()` to spin.

### Phase 3 — Spinning Vault

- **`src/components/coming-soon/StepRaffleSpin.tsx`**
  - Replace the auto-spin with a **tap-to-spin** gesture (button + swipe). Add 3.5s ease-out rotation curve, haptic at start and on stop. Reuse existing `spin-wheel` edge function for the prize result; keep current prize set.

### Phase 4 — Ticket Reveal

- **New: `src/components/coming-soon/StepTicketReveal.tsx`**
  - Full-screen takeover with glowing neon-orange ticket frame, prize label, ticket code, `SAVE MY TICKET` CTA → closes wizard, marks gate completed, navigates to `/` (Watch Feed for fans, Creator Hub for barbers per existing role-routing memory).

### Phase 5 — Backend touch-ups (minimal)

- **`supabase/functions/register-lead/index.ts`** — soften 409 (see Phase 1).
- **New migration (single, small):** `award_signup_bonus(user_id uuid)` SQL function — idempotent, grants 15 BB to `barber_bucks_wallet`, writes a ledger row tagged `signup_bonus`, no-op if already granted. Called from the Claim & Continue button via a new tiny edge function `award-signup-bonus` (or piggyback on `finalize-oauth-claim` / `submit-role-details` for the OAuth/email paths respectively).
- **No changes** to `handle_new_user`, `profiles` schema, RLS, or any other table — the existing trigger already reads `user_type` from `raw_user_meta_data`.

## Out of scope

- No visual rework of `StepRole` (already on-brand).
- No changes to the Auth callback PKCE/OTP code paths added previously — they remain.
- No new third-party packages (confetti done inline).
- No changes to subscription tiers, navigation, or post-onboarding routing rules.

## Files touched

- `src/components/coming-soon/LaunchWizard.tsx` (reorder + sessionStorage)
- `src/components/coming-soon/StepIdentityHook.tsx` (accept role props, drop register-lead call, bundle metadata)
- `src/components/coming-soon/StepBucksReward.tsx` (new)
- `src/components/coming-soon/StepRaffleSpin.tsx` (tap-to-spin + timing)
- `src/components/coming-soon/StepTicketReveal.tsx` (new, replaces StepClaimAccount in the final slot)
- `src/pages/AuthCallback.tsx` (post-signin role finalize + resume wizard)
- `supabase/functions/register-lead/index.ts` (200 on duplicate)
- New migration: `award_signup_bonus` RPC
- New edge function: `award-signup-bonus` (thin wrapper calling the RPC with the caller JWT)

Approve and I'll execute end-to-end in one pass.