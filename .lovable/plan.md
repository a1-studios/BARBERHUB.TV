## Goal

When a new user confirms their email (or signs in for the first time), they should be:
1. Forced into the role/country picker (today's `ProfileCompletionGate`) so it actually opens.
2. Walked through the existing `HowItWorks` intake flow.
3. Credited the **+15 BB welcome bonus only after they finish the intake**, with a celebration.

Fans keep the "Watch first, decide later" soft dismiss; barbers stay hard-blocked by VIP.

## Why the gate isn't opening today

`ProfileCompletionGate` checks `user` once on mount and on `user` change. After email confirmation the redirect lands on `/` before Supabase finishes hydrating the session, so `user` is briefly `null` and the profile query never runs — the modal never schedules its 800 ms auto-open. There is also no listener for `onAuthStateChange`, so a sign-in that happens after mount (magic link, OAuth callback, fresh confirmation) isn't picked up.

## Changes

### 1. Make the gate reliably open after confirmation
- In `src/components/auth/ProfileCompletionGate.tsx`:
  - Replace the one-shot `useEffect([user])` with a small `useAuthReady` pattern: subscribe to `supabase.auth.onAuthStateChange` and re-run the `profiles` + `is_global_vip_mode` check on `SIGNED_IN`, `TOKEN_REFRESHED`, and `USER_UPDATED` events.
  - Detect the email-confirmation handoff: if the URL has `?confirmed=1`, `#access_token=…`, or `type=signup` in the hash, force `setOpen(true)` after auth resolves and strip the param.
  - Guard against StrictMode double-fire with a `mountedRef`.

### 2. Add a two-step gate → intake flow
- Introduce a local `phase` state in `ProfileCompletionGate`: `'collect' | 'intake' | 'done'`.
- After the user submits role + country (and barber status + VIP if applicable):
  - Call `finalize-oauth-claim` exactly as today.
  - **Do not** call `claim_welcome_bonus` yet.
  - Switch `phase` to `'intake'`.
- Render a new `IntakeWalkthrough` overlay (see step 3) inside the same full-screen container so the user can't fall back to the app between steps.

### 3. New `IntakeWalkthrough` component
- Path: `src/components/onboarding/IntakeWalkthrough.tsx`.
- Wraps the existing `HowItWorks` cards but adds:
  - A small step counter / progress bar (`1 / N`).
  - A `Next` / `Back` pager that advances through the role-specific cards (`barberFlow` for barbers, `fanFlow` for fans — pulled by lifting the arrays out of `HowItWorks.tsx` into a shared `onboardingSteps.ts`, or by re-exporting them).
  - A final "Claim +15 BB" CTA on the last slide.
- On final CTA:
  - `await supabase.rpc('claim_welcome_bonus')` (already idempotent server-side).
  - Mark `phase = 'done'`, invalidate the same React Query keys the current gate already invalidates (`profile-incomplete`, `profile`, `userRoles`, `header-profile`, `barber_bucks`, `barber_bucks_transactions`).
  - Show a 1.5 s celebration burst (reuse `useCelebrationEffect` if present, otherwise a simple confetti motion div) then close.

### 4. Re-entry protection
- Persist `phase` keyed by `user.id` in `localStorage` (e.g. `gate_phase:<uid>`) so a refresh mid-intake drops them back into the same step instead of skipping the bonus.
- If `useProfileIncomplete` reports complete but `gate_phase` says `intake`, resume the walkthrough. If the bonus has already been credited (RPC returns `already_claimed`), just close silently.

### 5. Existing copy tweak
- Update the gate header subtext to read "Finish setup, then claim **+15 BB**" so users know the reward is end-of-flow, not on first click.
- Change the submit button label from "Claim +15 BB" to "Continue →" while in the `collect` phase; keep "Claim +15 BB" only on the intake's final step.

### 6. Dismissibility
- Keep `canDismiss` (fans only) on the `collect` phase exactly as today.
- During `intake` phase: fans can dismiss with "Finish later" (no bonus credited, gate will reappear on next gated route via existing `useProfileIncomplete` + the `gate_phase` flag).
- Barbers stay hard-blocked throughout both phases.

## Files touched

- `src/components/auth/ProfileCompletionGate.tsx` — auth-ready listener, two-phase state, render `IntakeWalkthrough`, move bonus claim to end.
- `src/components/onboarding/IntakeWalkthrough.tsx` — new, role-aware step pager + final claim CTA.
- `src/components/onboarding/HowItWorks.tsx` — extract `barberFlow` / `fanFlow` arrays into a shared module (or export them) so the walkthrough reuses the same content.
- No DB migration. `claim_welcome_bonus` and `finalize-oauth-claim` are already in place.

## Out of scope

- Changing the visual design of the existing gate beyond the copy tweaks above.
- Touching the Path-to-Victory 7-step ceremony — user explicitly picked HowItWorks.
- Any changes to barber VIP / invite-code logic.