
# Unified Onboarding Pipeline — Refactor Plan

## Summary

Demolish 5 legacy intake flows and consolidate into a **single auth-deferred funnel** mounted on `/`:

```
ROLE → SPIN → AUTH (email+password+username+country) → SIGN-UP → CLAIM PRIZE → DASHBOARD
```

The existing `LaunchWizard` / `Step*` components already implement ~90% of this. The work is mostly a **reorder + delete** operation, not a from-scratch build.

---

## 1. Demolition (delete files)

### Orphaned (already not on any registered route — safe deletes)
- `src/pages/Auth.tsx`
- `src/components/auth/SignUpForm.tsx`
- `src/components/auth/RoleSelection.tsx`
- `src/components/auth/InstagramFollowVerification.tsx`
- `src/components/auth/RoleSelector.tsx`

### Path-to-Victory tree (rip out entirely)
- `src/components/auth/ArenaGateModal.tsx`
- `src/components/auth/ArenaGateBarberInfoStep.tsx`
- `src/components/auth/ArenaGateCredentialsStep.tsx`
- `src/components/auth/ArenaGateInstagramStep.tsx`
- `src/components/auth/ArenaGateChooseTierStep.tsx`
- `src/components/auth/ArenaGateChooseCategoriesStep.tsx`
- `src/components/auth/ArenaGateProgressIndicator.tsx`
- `src/components/auth/ClipperSwipeVerifier.tsx`
- `src/components/auth/FlagCarousel.tsx` (only used by ArenaGate)
- `src/components/auth/FreshAnimation.tsx` (only used by ArenaGate)

### Remove all references to ArenaGateModal / AuthDialog signup paths
- `src/pages/Index.tsx` — remove `<ArenaGateModal>` mount + `onOpenArenaGate` prop wiring
- `src/components/LandingHero.tsx` — strip the entire inline Sign-In/Sign-Up Tabs UI; keep ONLY the Sign-In path (or delete the file and replace with a thin stub that opens the new wizard for guests)
- `src/components/vault/VaultVictory.tsx` — replace `ArenaGateModal` + `AuthDialog` usage with a single CTA that opens the new unified wizard
- `src/components/creator/CreatorHub.tsx` and `src/pages/CreatorHub.tsx` — `AuthDialog` "sign in" CTAs must redirect to `/` so the unified gate handles it (or render a minimal sign-in only modal)

### Keep but unchanged
- `src/components/auth/AuthDialog.tsx` — **keep only as a Sign-In dialog** for already-existing users. Strip the entire Sign-Up tab + role pills + Arena Gate barber branch. Used by Header/CreatorHub for "Sign In".
- `src/components/auth/ForgotPasswordForm.tsx` — keep
- `src/components/auth/AuthGuard.tsx`, `BarberGuard.tsx`, `AdminGuard.tsx`, `SovereignGuard.tsx` — keep
- `src/components/auth/ProfileSetupPrompt.tsx` — keep (post-signup profile completion gate, separate concern)

---

## 2. Unified Wizard — reorder existing `LaunchWizard`

The existing `LaunchWizard` flow today is: **Email → Role → Spin → Country → Finalize**.
The new flow per spec is: **Role → Spin → (Email + Password + Username + Country) → Finalize**.

### Edit `src/components/coming-soon/LaunchWizard.tsx`
- Reorder steps to: `1. StepRole → 2. StepSpin → 3. StepIntake → 4. StepLiveFinalize` (4 steps, not 5).
- `StepEmail` is no longer reached during the funnel — but its `fbqTrack('Lead')` call must move into the new `StepIntake` form's `onContinue` handler so the Lead pixel still fires before sign-up.
- Drop the `prefilledRole` / `wizard_resume_spin` OAuth-resume branch entirely (no OAuth in new flow). Remove related `localStorage` keys (`pending_social_role`, `wizard_resume_spin`).
- Update `SegmentedProgress` total from 5 → 4.

### New file: `src/components/coming-soon/StepIntake.tsx`
Combines what `StepEmail` + `StepCountry` + the password field of `StepLiveFinalize` collected. Fields:
- Email (required, regex-validated)
- Username / Display Name (required, min 2 chars)
- Country (CountrySelector, required)
- Password (min 8)

On submit:
- Fire `fbqTrack('Lead', { email, country })` + persist `marketing_leads` row (moved from old `StepEmail`).
- Stash `pending_prize` in localStorage:
  ```
  localStorage.setItem('pending_prize', JSON.stringify({
    prize_id, prize_label, prize_bb, prize_type, duration_months,
    role, timestamp: Date.now()
  }))
  ```
- Advance to `StepLiveFinalize` which performs the actual `supabase.auth.signUp(...)`.

### Edit `src/components/coming-soon/StepLiveFinalize.tsx`
- Remove the in-step password input (now collected in `StepIntake`); receive password via prop.
- Keep `supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/', data: { display_name, user_type, country_code } } })`.
- Keep all analytics: `fbqTrack('CompleteRegistration')`, `gtagFireRegistration({ transaction_id, value })`.
- Keep `markGateCompleted()` call (server-side anti-abuse record).
- Keep `marketing_leads` upsert with attribution.
- Replace the legacy `pending_spin_prize` localStorage key with the spec's `pending_prize` key (also remove dual-key writes elsewhere).

### Edit `src/components/coming-soon/StepRole.tsx` and `StepSpin.tsx`
- `StepRole`: no change beyond it now being step 1.
- `StepSpin`: replace its localStorage write to `pending_spin_prize` with `pending_prize` (single key).

### Delete
- `src/components/coming-soon/StepEmail.tsx` (logic absorbed into `StepIntake`).
- `src/components/coming-soon/StepReveal.tsx` (waitlist mode is no longer used by Index — see §4).
- `src/components/coming-soon/StepCountry.tsx` (logic absorbed into `StepIntake`).

---

## 3. Prize Resolution (claim after sign-up)

### Edit `src/pages/Index.tsx` (recovery effect, currently lines 188–231)
- Rename localStorage key from `pending_spin_prize` → `pending_prize` (consistent with spec).
- Keep the existing `supabase.functions.invoke('spin-wheel', { body: { ..., is_free_spin: true } })` call exactly — that edge function already enforces "new account only" (1-hour window) + "no double-claim" guards.
- On success: clear `pending_prize`, invalidate `barber_bucks` / `user_prizes` queries, toast confirmation.
- Then route to dashboard:
  - `isBarber` → `navigate('/portal')`
  - `isFan` → stay on `/` (FanArenaView is already the fan dashboard) OR `navigate('/watch')` per existing role-navigation-defaults memory.

### `supabase/functions/spin-wheel/index.ts` — NO CHANGES
Already handles: JWT check, new-account-only window, idempotent double-claim guard, balance update, prize ledger insert, `user_prizes` insert for non-BB prizes. Spec explicitly says "Trigger the existing edge function" — leave it untouched.

### `supabase/functions/check-gate-eligibility/index.ts` — NO CHANGES
Preserved verbatim per protection directive.

---

## 4. `Index.tsx` mount logic (guest gate)

Replace current dual-mount (`LaunchWizard` for first-time + `LaunchWizard` for OAuth resume + `ArenaGateModal`) with a single guarded mount:

```
{!user && showSpinWheel && (
  <LaunchWizard onClose={handleSpinClose} />
)}
```

- Drop the `mode='waitlist' | 'live'` prop — wizard always operates in live (signup) mode now.
- Drop `LandingHero` sign-up Tabs UI — guests landing on `/` see the marketing hero + a single CTA that calls `setShowSpinWheel(true)`. Keep an "Already have an account? Sign in" link that opens the trimmed `AuthDialog` (sign-in only).
- Keep all eligibility logic, `check-gate-eligibility` invocations, and `markGateCompleted()` calls.

---

## 5. Pre-Launch & Coming-Soon (PROTECTED — no changes)

- `src/pages/ComingSoon.tsx` keeps importing `LaunchWizard`. Since we renamed the wizard's flow, ComingSoon still works but now also collects password + auto-creates accounts. Per spec this is desired — coming-soon visitors get the same gamified onboarding. The `marketing_leads` upsert path in `StepIntake` doubles as the waitlist capture, so the waitlist isn't lost.
- `IS_COMING_SOON` routing in `App.tsx` — no changes.

---

## 6. Database — no migrations needed

- `handle_new_user()` trigger reads `display_name`, `user_type`, `country_code` from raw_user_meta_data — exactly the fields we send. No change.
- `assign_social_auth_role` RPC remains but becomes unreferenced (OAuth removed); leave the function in place to avoid breaking past users mid-flight.

---

## 7. Analytics mapping (preserved)

| Pixel | Old location | New location |
|---|---|---|
| `fbqTrack('Lead')` | `StepEmail.handleEmailContinue` | `StepIntake` form submit (before sign-up) |
| `fbqTrack('CompleteRegistration')` | `StepLiveFinalize.handleSignUp` | unchanged (still in `StepLiveFinalize`) |
| `gtagFireLead` | `StepEmail` + `LaunchWizard` prefill effect | `StepIntake` form submit |
| `gtagFireRegistration` | `StepLiveFinalize` | unchanged |

`captureAttribution()` still called once on wizard mount.

---

## 8. Files matrix

**Delete (15 files):**
Auth.tsx, SignUpForm, RoleSelection, InstagramFollowVerification, RoleSelector, ArenaGateModal, ArenaGateBarberInfoStep, ArenaGateCredentialsStep, ArenaGateInstagramStep, ArenaGateChooseTierStep, ArenaGateChooseCategoriesStep, ArenaGateProgressIndicator, ClipperSwipeVerifier, FlagCarousel, FreshAnimation, StepEmail, StepReveal, StepCountry.

**Create (1 file):**
`src/components/coming-soon/StepIntake.tsx`

**Edit (6 files):**
`LaunchWizard.tsx`, `StepRole.tsx`, `StepSpin.tsx`, `StepLiveFinalize.tsx`, `src/pages/Index.tsx`, `src/components/LandingHero.tsx`, `src/components/auth/AuthDialog.tsx` (strip signup tab), `src/components/vault/VaultVictory.tsx`, `src/components/creator/CreatorHub.tsx`, `src/pages/CreatorHub.tsx`.

---

## What stays untouched (protection directive)

- `supabase/functions/spin-wheel/index.ts`
- `supabase/functions/check-gate-eligibility/index.ts`
- `src/components/promotion-gate/useGateState.ts` (`markGateCompleted`)
- `src/pages/ComingSoon.tsx`
- `IS_COMING_SOON` routing in `App.tsx`
- `marketing_leads` upserts and the `update_marketing_lead_by_fingerprint` RPC
- `handle_new_user()` DB trigger
- Meta Pixel + Google Ads helpers (`src/lib/metaPixel.ts`, `src/lib/googleAds.ts`)

---

**Approve to begin implementation.**
