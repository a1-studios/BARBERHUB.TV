

## Goal
The home page (`/`) is still showing the **old static `EmailGateStep`** (via `SpinWheelOverlay`), not the new gamified `LaunchWizard`. Replace the entire old promotion-gate chain with the new wizard so users get the same dopamine-rich, swipe-driven, 5-step animated experience whether they land on `/` (live) or `/coming-soon`. Keep the wizard's existing visual polish — only add the missing "live signup" branch so prizes actually credit to a real account.

## Root cause (why it still looks basic)
- `Index.tsx` mounts `<SpinWheelOverlay>` for guests. That overlay renders the legacy `EmailGateStep → IdentifyStep → VaultWheelStep → RewardStep → FinalizeStep` chain — a single-form, no segmented progress, no swipe, no 3D coin pop.
- The new gamified `LaunchWizard` is only wired into `ComingSoon.tsx`. So `/coming-soon` looks great; `/` looks basic.

## Approach
Unify on **one** intake component: `LaunchWizard`. Mount it from `Index.tsx` for guests. Add a "live mode" path so Step 5 actually creates the account (currently it only inserts into `marketing_leads`).

## Changes

### 1. `LaunchWizard.tsx` — add a `mode` prop
```ts
type LaunchWizardMode = 'waitlist' | 'live';
interface LaunchWizardProps { onClose: () => void; mode?: LaunchWizardMode; }
```
- `mode='waitlist'` (default, used by `ComingSoon`): keeps current behavior — save lead, store `pending_spin_prize`, show "we'll email you when doors open."
- `mode='live'` (used by `Index`): same 5 steps, but Step 5 also signs the user up (`supabase.auth.signUp` with magic-link / passwordless or quick password collection), then auto-claims the prize against the new account.

### 2. New `StepLiveFinalize.tsx` (replaces `StepReveal` when `mode='live'`)
Same 3D coin pop + gold shimmer + confetti as `StepReveal`, but adds a single password field below the prize card (or "Magic link sent!" state if we go passwordless). On submit:
- Reuses existing `IdentifyStep`/`FinalizeStep` signup logic — calls `supabase.auth.signUp({ email, password, options: { data: { display_name, role, country_code } } })`.
- On success: writes prize to `pending_spin_prize` localStorage (already wired to auto-claim via `Auth.tsx`/`Index.tsx`).
- Calls existing `markGateCompleted()` from `useGateState.ts` so `Index` stops re-opening the gate.
- Fires the same `CompleteRegistration` Meta + Google Ads events (already in StepReveal).

### 3. `Index.tsx` — swap overlay
Replace:
```tsx
{showSpinWheel && <SpinWheelOverlay onClose={handleSpinClose} />}
```
with:
```tsx
{showSpinWheel && <LaunchWizard mode="live" onClose={handleSpinClose} />}
```
Keep all existing guards (`gate_completed` flag, `spin_wheel_shown` session key) untouched.

### 4. Delete dead code (cleanup, optional)
- `src/components/SpinWheelOverlay.tsx`
- `src/components/promotion-gate/EmailGateStep.tsx`
- `src/components/promotion-gate/IdentifyStep.tsx`
- `src/components/promotion-gate/VaultWheelStep.tsx`
- `src/components/promotion-gate/RewardStep.tsx`
- `src/components/promotion-gate/FinalizeStep.tsx`

Keep `useGateState.ts` (the `markGateCompleted()` helper is still used to permanently close the gate after signup).

### 5. `LaunchWizard` polish to match the spec the user keeps asking for
Current wizard is good, but tighten these to make the "interactive animated" feel land harder on first impression:
- **Step 1 (Email)**: Already has floating label + orange focus glow + dual-layer pill. ✅ Just verify the cyan `focus:ring` stops at the spec — keep orange dominant.
- **Step transitions**: Add a 180ms full-card "whoosh" — a faint white-radial flash + slight `scale: 1 → 1.02 → 1` pulse on the new card as it slides in. (One-line addition inside `SwipeableStep`.)
- **Spin step**: Add a 120ms pre-spin "charging" pulse on the orange ring around the wheel housing so the user sees energy gathering before tapping spin.
- **Reveal coin**: Already pops, rotates 720°, and confetti fires. Add a 1-second delayed "+25 BB" number tick beneath the coin using `AnimatedCounter` (already in repo) for the dopamine number-go-up moment.

## Files Touched

| File | Change |
|---|---|
| `src/components/coming-soon/LaunchWizard.tsx` | Add `mode?: 'waitlist' \| 'live'` prop; route Step 5 to `StepLiveFinalize` when `mode='live'` |
| `src/components/coming-soon/StepLiveFinalize.tsx` | **NEW** — 3D coin pop + password field + real `signUp` + prize claim + `markGateCompleted()` |
| `src/components/coming-soon/SwipeableStep.tsx` | Add 180ms whoosh radial flash on enter |
| `src/components/coming-soon/StepReveal.tsx` | Add `AnimatedCounter` "+N BB" tick under the coin |
| `src/components/coming-soon/StepSpin.tsx` | Add 120ms pre-spin charging pulse on the wheel ring |
| `src/pages/Index.tsx` | Replace `<SpinWheelOverlay>` with `<LaunchWizard mode="live">` |
| `src/components/SpinWheelOverlay.tsx` | **DELETE** |
| `src/components/promotion-gate/EmailGateStep.tsx` | **DELETE** |
| `src/components/promotion-gate/IdentifyStep.tsx` | **DELETE** |
| `src/components/promotion-gate/VaultWheelStep.tsx` | **DELETE** |
| `src/components/promotion-gate/RewardStep.tsx` | **DELETE** |
| `src/components/promotion-gate/FinalizeStep.tsx` | **DELETE** |

## Out of Scope
- Changing the existing prize-claim auto-credit flow (already correct in `Auth.tsx`/`Index.tsx`).
- Database migrations (none needed — `marketing_leads` already has all required columns).
- Server-side Google Ads conversions (separate request).
- Removing `useGateState.ts` (keep `markGateCompleted` helper).

## Result
- The home page (`/`) now opens the **same gamified, swipe-driven, glass-morphic, segmented-progress wizard** the user already loved on `/coming-soon`.
- Step 1 hits the dopamine immediately: orange-glow floating-label input, particle burst, dual-layer pill CTA.
- Step 5 detonates the reward: 3D coin pop + 720° rotation + orange ring expansion + gold shimmer + confetti + animated +N BB counter tick.
- Live mode: prize is tied to the email at signup (existing auto-claim logic untouched). Waitlist mode (`/coming-soon`): prize stays in localStorage, credited when they later sign up with that exact email.
- One intake component to maintain instead of two parallel chains.

