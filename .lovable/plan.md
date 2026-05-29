# Revised Plan — Frictionless OTP + Profile-Gate VIP Upgrade

## Flow (single source of truth)
1. Landing → one CTA → `AuthModalV2` (identity → verify only).
2. New user lands logged in as **fan** by default, with **+15 BB welcome bonus** credited and visible in the wallet (locked/claimable until profile complete).
3. `ProfileCompletionGate` auto-opens:
   - Pick **Fan** → enter name + country → profile complete → 15 BB unlocked.
   - Pick **Barber** → a VIP invite code field appears in the same modal → validate + redeem → role flips to barber → profile complete → 15 BB unlocked.
4. No separate "Become a Barber" dialog. The gate **is** the gateway.

---

## Step 1 — Strip the Velvet Rope from the landing
`src/components/landing/VelvetRopeLanding.tsx`
- Remove role pills + VIP code panel + "Redeem VIP Invite" CTA.
- Replace with one primary CTA "Enter Barber Hub" that opens `AuthModalV2` with `mode='signup'` and no `intendedRole`.
- Keep the "Already a member? Sign in" footer.

## Step 2 — Collapse `AuthModalV2` to identity → verify
`src/components/auth/AuthModalV2.tsx`
- Delete `'gate'` and `'role'` steps; initial step = `'identity'` for both modes.
- Remove `usePlatformState('global_vip_mode')`, `code`, `validatedCode`, and all `validate_access_code` / `redeem_access_code` calls.
- Drop `intendedRole` prop usage. Stop sending `intended_role` to `signInWithOtp` and to `send-sms-otp` / `verify-sms-otp`.
- In `handleVerify`, remove the `user_roles` upsert and `profiles.user_type` write. The DB trigger already defaults `user_type = 'fan'`.
- Update copy ("Sign in with a 6-digit code").

## Step 3 — Default-fan guarantees on the backend
- `supabase/functions/verify-sms-otp/index.ts`: stop forcing role; idempotently ensure a `user_roles` row with `role='fan'` after admin-create. Remove `intended_role` from the body.
- New migration: update `handle_new_user()` trigger to also `INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'fan') ON CONFLICT DO NOTHING`, so role-gated UI works immediately for new fans (email and SMS paths).

## Step 4 — Welcome bonus (+15 BB, locked until profile complete)
DB (new migration):
- Add `profiles.welcome_bonus_state TEXT DEFAULT 'pending'` (values: `pending` | `claimed` | `forfeited`).
- Extend `handle_new_user()`: on insert, also credit `profiles.barber_bucks += 15` and insert a `barber_bucks_transactions` row tagged `type='welcome_bonus'`, `state='locked'`, `amount=15`. (Or store as a pending entry — see "wallet display" below.)
- New RPC `claim_welcome_bonus(_user_id uuid)` (SECURITY DEFINER, FOR UPDATE locked):
  - Requires `profiles.user_type IS NOT NULL` AND `profiles.country_code IS NOT NULL`.
  - Flips the locked transaction to `state='available'` and `profiles.welcome_bonus_state='claimed'`.
  - Idempotent.

Frontend:
- `useBarberBucks` already reads `profiles.barber_bucks`. Extend it (or a small new `useWelcomeBonus` hook) to also surface `welcome_bonus_state` so the wallet badge can show a "+15 BB pending — finish profile to claim" pill.
- BB dropdown / wallet pill: when `welcome_bonus_state='pending'`, show a small "Claim 15 BB" CTA that opens the profile gate.

## Step 5 — Repurpose `ProfileCompletionGate` as the role + VIP gateway
`src/components/auth/ProfileCompletionGate.tsx`
- Headline: "Finish your profile — claim **+15 BB**".
- Keep the existing Barber / Fan toggle and the country selector (required).
- When `role === 'barber'`, render a new VIP invite code input below the barber-status pills (required for barber role).
- On submit:
  1. If `role === 'barber'`: `supabase.rpc('validate_access_code', { p_code })`; reject if invalid.
  2. Call existing `finalize-oauth-claim` edge function with `{ role, barber_status, country_code, phone_number }` (it already writes `user_type` + seeds `user_roles`).
  3. If `role === 'barber'`: `supabase.rpc('redeem_access_code', { p_code, p_user_id, p_email })`.
  4. `supabase.rpc('claim_welcome_bonus')` to unlock the 15 BB.
  5. Invalidate `['userRoles']`, `['profile']`, `['profile-incomplete']`, `['header-profile']`, `['barber_bucks']`, `['barber_bucks_transactions']`.
- Auto-open behavior stays as-is (~800ms post sign-in, plus on gated routes). Add a one-time celebratory toast on successful claim.

## Step 6 — Cleanup
- Remove the "Become a Barber" upgrade dialog idea (not implemented).
- Remove `intendedRole` plumbing from `VelvetRopeLanding` ↔ `AuthModalV2`.
- Keep `AuthDialog` (legacy password flow), Sovereign code generation, and the `access_codes` schema untouched.

## Out of scope
- `access_codes` table + `validate_access_code` / `redeem_access_code` RPCs — unchanged.
- Sovereign HQ admin panels — unchanged. `global_vip_mode` becomes inert for public funnel; admins can still toggle it for legacy use.
- Twilio SMS OTP infra — unchanged, just no longer receives `intended_role`.
- Pricing, BB economy rules, withdrawal gating.

## Risks & mitigations
- Existing pending users without `welcome_bonus_state`: backfill in the same migration (set existing rows to `'forfeited'` so they don't retroactively get 15 BB).
- A fan who later wants to become a barber: re-opens the profile gate from settings (existing "Switch role" affordance — verify the gate can be re-triggered via `requireProfileComplete()`).
- VIP code reuse: governed entirely by existing `access_codes` row's max-uses logic — no change needed.
