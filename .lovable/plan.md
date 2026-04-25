## Problem

The promotion gate (Launch Wizard) currently forces users through `Email → Role → Country → Spin → Claim`. Users are tapping Barber/Fan and immediately landing on the Country step, which feels like the role choice was ignored and the promised "spin to win" never appears before they bail. The reward is deferred far behind the moment of commitment, so users abandon before the dopamine hit.

The desired flow: as soon as we have *verifiable* signal (email + role choice), spin the wheel immediately. Then require the user to finish their profile (country + password) to actually claim the prize.

## New Step Order

```text
1. Email          (verifiable contact)
2. Role           (Barber / Fan)
3. SPIN WHEEL     ← reward shown immediately after role pick
4. Country        ← profile completion gate (required to claim)
5. Claim & Sign Up (password) — prize unlocks on signup
```

## Changes

### `src/components/coming-soon/LaunchWizard.tsx`
- Swap the render order in the `AnimatePresence` block: Step 3 becomes `StepSpin`, Step 4 becomes `StepCountry`. Step 5 (`StepLiveFinalize` / `StepReveal`) stays as the final claim screen.
- Update the `prefilledRole` resume effect: when resuming after social OAuth with a pre-chosen role, jump to step 3 (Spin) instead of the old step 4.
- Country step `onContinue` advances to the claim step. Country step is now **not skippable** in `live` mode — remove the Skip button on country (or have Skip also call onClose) so users must select a country before they can claim.
- Pass a prop to `StepSpin` so its "Skip" button is disabled / hidden once the wheel has been spun (prize must not be abandoned mid-flow without claim).

### `src/components/coming-soon/StepCountry.tsx`
- Add a `requireSelection` mode (used in `live` flow). When true, the Continue button stays disabled until a country is chosen and the Skip control is hidden. Add a small banner: "Select your country to claim your prize."

### `src/components/coming-soon/StepSpin.tsx`
- After the wheel resolves, replace the auto-advance with a clear CTA: **"Continue to claim →"** that advances to the Country step. This makes the user feel they earned the prize and now must finish to keep it.
- Hide the "Skip" button after a prize has been revealed (passing a `prizeRevealed` flag locally based on `onResult` having fired).
- Add a small "Locked until you finish your profile" pill under the prize amount so the user understands why they still need to continue.

### `src/components/coming-soon/StepLiveFinalize.tsx`
- No structural change to signup logic, but tighten the copy: "Finish your profile to unlock <prize.label>" so the link between *finishing* and *claiming* is explicit.
- The existing `pending_spin_prize` localStorage handoff + the `Index.tsx` auto-claim effect already gates BB credit on successful signup, so the "must finish to collect" guarantee is preserved server-side.

### `src/pages/Index.tsx`
- Update the OAuth-resume branch: `startStep={3}` instead of `startStep={4}` (Spin is now step 3).
- No other logic changes — the eligibility check, fingerprint tracking, and `gate_completed` flag continue to work as-is.

### `src/components/coming-soon/StepRole.tsx`
- Reduce the 280ms pulse-then-advance delay to ~180ms and add a stronger orange bloom + "Locked in" micro-label so the role pick reads as confirmed before the spin appears (this addresses the "it skipped my selection" perception).

## What this does not change

- The fingerprint + IP server-side eligibility check stays in place — gate still only shows for first-time guest visitors.
- Authenticated users still never see the wizard.
- The `pending_spin_prize` recovery path on `Index.tsx` continues to credit BB on signup, so the "finish profile to collect" guarantee is enforced even if the user closes the modal between Spin and Claim — they only get credit once an authenticated session exists.

## Files touched

- `src/components/coming-soon/LaunchWizard.tsx`
- `src/components/coming-soon/StepRole.tsx`
- `src/components/coming-soon/StepSpin.tsx`
- `src/components/coming-soon/StepCountry.tsx`
- `src/components/coming-soon/StepLiveFinalize.tsx`
- `src/pages/Index.tsx`
