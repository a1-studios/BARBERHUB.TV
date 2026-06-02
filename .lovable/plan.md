# VIP-gated Barber Signup — Logic Fix Plan

The Sovereign VIP code is currently asked for in **one** of two onboarding surfaces (`ProfileCompletionGate`), but the main pre-auth `LaunchWizard` (the screen in your screenshot) lets anyone pick "I'm a Barber" without a code. And neither surface is enforced server-side, so the gate is bypassable.

## What changes

### 1. `StepRole.tsx` (LaunchWizard — the screen in your screenshot)
- When `role === 'barber'`, reveal an **inline VIP Invite Code** field above the country/phone row, with the same orange-glow styling as the rest of the wizard.
- Pre-validate the code on blur via `validate_access_code` RPC (advisory: shows a green checkmark or "Invalid code" hint, never blocks typing).
- `ready` becomes: `role === 'fan' || (role === 'barber' && barberStatus && vipCode.trim())`.
- Pass `vipCode` through `onContinue` and persist it in `sessionStorage`/wizard state so the auth step can forward it.
- Add an "Don't have a code? Switch to Fan" helper line.

### 2. `LaunchWizard.tsx`
- Extend `State` with `vipCode: string`.
- Pass `vipCode` to `StepAuth` so the post-OTP/post-OAuth finalize call includes it.

### 3. `submit-role-details/index.ts` (called from StepRole)
- Add optional `vip_code` to `BarberBody`.
- When present, call `validate_access_code` and, if invalid, return `400 { error: 'invalid_vip_code' }`. (Don't redeem here — user isn't authed yet; just refuse to mark the lead as barber.)
- If `role === 'barber'` and `vip_code` is missing **and** `is_global_vip_mode()` is true → return 400.

### 4. `finalize-oauth-claim/index.ts` (the actual role flip)
- Add optional `vip_code` to schema.
- If incoming `role === 'barber'`:
  - Read `is_global_vip_mode()`.
  - When VIP mode is on, require `vip_code`; call `validate_access_code` server-side; on failure return 403 `{ error: 'invalid_vip_code' }` **before** any profile/role mutation.
  - After successful `sync_user_binary_role`, call `redeem_access_code(p_code, user.id, email)`.
  - Map `barber_status` → `profiles.sub_category` (`licensed`→`licensed_pro`, `unlicensed`→`unlicensed_pro`, `student`→`student`, `beginner`→`beginner`, `aspiring`→`aspiring`) so `get_public_league_stats` aggregates finally fill.
- Fan flow unchanged.

### 5. `ProfileCompletionGate.tsx`
- Remove the client-side `validate_access_code` + `redeem_access_code` duplication; just pass `vip_code` through to `finalize-oauth-claim` and let the edge function be the source of truth.
- Hide "Watch first, decide later" escape hatch when the user has explicitly chosen barber but no valid code yet (so they can't bypass).
- Honor `is_global_vip_mode()`: hide the VIP field entirely when VIP mode is off.

### 6. Shared status constant
- Extract `BARBER_STATUSES` to `src/lib/barberStatuses.ts` so `StepRole` and `ProfileCompletionGate` can't drift again.

## Out of scope (intentionally)
- No DB migration. `access_codes`, `validate_access_code`, `redeem_access_code`, `is_global_vip_mode` already exist; `profiles.sub_category` is free-text. No CHECK constraints to touch.
- OTP edge functions (`send-sms-otp`/`verify-sms-otp`) keep creating users as fans by default — the role flip + VIP check happen in `finalize-oauth-claim` after auth. This preserves the OTP "watch first, decide role later" UX.
- No changes to Twilio, Stream, or BB economy code.

## Verification after build
1. From wizard, pick **Barber** → VIP field appears; submit empty → blocked client-side.
2. Submit garbage code → server returns 400, lead stays as fan.
3. Submit a valid Sovereign-generated code → wizard advances, OTP/OAuth completes, `finalize-oauth-claim` flips role to barber, redemption row created.
4. Pick **Fan** → no VIP field, normal flow.
5. Toggle `global_vip_mode = false` in Sovereign HQ → VIP field disappears from both surfaces, barber signup works without a code.
6. SQL: `select sub_category, count(*) from profiles where user_type='barber' group by 1;` — counts start incrementing for new signups.

Approve and I'll implement.
