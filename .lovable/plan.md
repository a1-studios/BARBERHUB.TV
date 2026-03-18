

## Fix: Align Subscription Tier Names Across Sovereign Panel, Database, and Visuals

### Root Cause
Three separate naming systems exist — none align:
1. **Sovereign User Control Panel dropdown**: offers `starter`, `contender`, `champion`
2. **Database `barber_subscription_tiers` table**: stores `bronze`, `silver`, `gold`
3. **Visual components** (`AvatarCrest`, `TierRing`): expect `free`, `bronze`, `silver`, `gold`, `diamond`

When you set a user to "diamond" via Sovereign, the dropdown doesn't even have that option. And any tier set via the current dropdown (`starter`/`contender`/`champion`) doesn't match the visual keys, so the crest always falls back to `free`.

Additionally, querying the database confirms **no barber profile currently has a tier set** — the Sovereign save likely wrote a value that didn't persist or wrote a non-matching key.

### Fix

#### 1. Update Sovereign User Control Panel dropdown
Replace the `starter`/`contender`/`champion` options with the actual tier keys used by the visual system: `bronze`, `silver`, `gold`, `diamond`. Add a "None" option to clear the tier.

**File**: `src/components/sovereign/UserControlPanel.tsx`

#### 2. Add Diamond tier to the subscription tiers component
Add diamond to the `tierIcons` and `tierColors` maps in `BarberSubscriptionTiers.tsx` so it renders correctly in the membership drawer.

**File**: `src/components/barber/BarberSubscriptionTiers.tsx`

#### 3. No changes needed to `AvatarCrest.tsx` or `TierRing.tsx`
Both already support `diamond` from the previous edit.

### Files Changed

| File | Change |
|------|--------|
| `src/components/sovereign/UserControlPanel.tsx` | Replace `starter`/`contender`/`champion` with `bronze`/`silver`/`gold`/`diamond` + "None" option |
| `src/components/barber/BarberSubscriptionTiers.tsx` | Add `diamond` to `tierIcons` and `tierColors` maps |

