

## Audit: Spin Wheel, Arena Gate, and Membership — Binary Role Logic Alignment

### Issues Found

#### Issue 1: Spin Wheel — "Back" button lets authenticated users reach role-select
**File**: `SpinWheelOverlay.tsx` line 220
The `confirm-spin` step has a "Back" button that navigates to `role-select`. For authenticated users, this should never happen — they should not be able to change their role. An authenticated barber could press Back, pick "Fan", and spin with fan prizes (getting "3 Month Free Cuts" instead of barber-appropriate "Premium" prizes).

**Fix**: Change the Back button behavior — for authenticated users, close the overlay instead of going to role-select. Or hide the Back button entirely for authenticated users.

#### Issue 2: Spin Wheel — Authenticated users not charged server-side for `is_free_spin`
**File**: `SpinWheelOverlay.tsx` line 70-78
When an authenticated user spins after confirming (paying 5 BB), the `handleResult` call to `spin-wheel` does NOT send `is_free_spin: false`. Since `is_free_spin` defaults to `undefined` (falsy), the edge function treats it as a paid spin — this is correct by accident. However, the BB deduction and prize capping at 100 BB happen server-side while the prize selection (weighted random) happens client-side. A user could manipulate client-side code to always select the best prize. This is a known limitation but worth noting.

#### Issue 3: Spin Wheel — Fan prizes awarded to barbers via `existing_fan` prize set
**File**: `SpinWheelOverlay.tsx` line 123-128
The `getPrizeSet()` function uses `selectedRole` not `detectedRole`. If `selectedRole` somehow becomes 'fan' for a barber (via the Back button issue above), they'd get fan prizes ("Free Cuts") instead of barber prizes ("Premium").

**Fix**: For authenticated users, always use `detectedRole` regardless of `selectedRole`.

#### Issue 4: Arena Gate — Only creates barber accounts
**File**: `ArenaGateModal.tsx` line 87
The Arena Gate hardcodes `user_type: 'barber'` in the signup metadata. This is correct — Arena Gate is the barber onboarding path. But it means there's no equivalent guided onboarding for fans. The LandingHero handles fan signup separately. This is consistent with binary roles.

**Status**: Correct — no fix needed.

#### Issue 5: Membership Tiers — Already properly gated
**File**: `BarberPublicProfile.tsx` line 291, `TierRing.tsx` line 42-44
`interactive={isOwner}` correctly limits the tier drawer to the profile owner. The `TierRing` also blocks the drawer if the user already has a non-free tier (`validTier !== 'free'` returns early on line 43). 

**Status**: Correct — no fix needed.

#### Issue 6: TierRing blocks upgrade for users who already have a tier
**File**: `TierRing.tsx` line 43
`if (interactive && validTier !== 'free') return;` — This means a Bronze barber can't open the drawer to upgrade to Silver/Gold/Diamond. This seems like a bug — barbers should be able to upgrade from any tier.

**Fix**: Remove the `validTier !== 'free'` early return so barbers with existing subscriptions can still view/change their tier.

---

### Summary of Fixes

| File | Issue | Fix |
|------|-------|-----|
| `SpinWheelOverlay.tsx` | Back button lets auth users reach role-select | Hide Back button for authenticated users (or make it close the overlay) |
| `SpinWheelOverlay.tsx` | `getPrizeSet()` uses `selectedRole` which could be manipulated | For auth users, force `detectedRole` in `getPrizeSet()` |
| `TierRing.tsx` | Blocks upgrade drawer for non-free tiers | Remove `validTier !== 'free'` guard so barbers can upgrade |

3 files, 3 targeted fixes.

