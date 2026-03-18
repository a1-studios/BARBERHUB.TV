

## Fix: Diamond Tier Not Recognized in Avatar Crest & TierRing

### Root Cause

The `AvatarCrest` and `TierRing` components only define visual styles for `free`, `bronze`, `silver`, and `gold` tiers. When Sovereign assigns "Diamond" status (setting `barber_profiles.active_subscription_tier = 'Diamond'`), the tier key falls through to `free` because there's no `diamond` entry in the lookup maps. This causes:

1. Ghost/free-tier wings and ring instead of diamond visuals
2. The interactive click handler opens the "Membership Plans" drawer (because `isActive` is false for `free`)

### Fix

#### 1. Add `diamond` to `AvatarCrest.tsx`
- Add diamond entry to `TIER_COLORS` with a distinctive cyan/blue-white color scheme (e.g., `hsl(200 80% 75%)` with bright glow)
- Create a `DiamondWings` component — more elaborate than gold, with crystalline/faceted shapes
- Set star count for diamond to 6
- Ensure `isActive` is true for diamond tier so the drawer doesn't open

#### 2. Add `diamond` to `TierRing.tsx`
- Add `diamond` entry to `TIER_BORDER` with a distinctive animated border (e.g., `border-4 border-cyan-300 animate-tier-glow-diamond`)
- Add diamond shimmer overlay alongside silver/gold

#### 3. Add CSS animations
- Add `animate-tier-glow-diamond` and `animate-crest-wing-diamond` keyframes to `index.css` for the diamond-specific glow/pulse effects

### Files Changed

| File | Change |
|------|--------|
| `src/components/AvatarCrest.tsx` | Add `diamond` to `TIER_COLORS`, create `DiamondWings`, set 6 stars for diamond |
| `src/components/TierRing.tsx` | Add `diamond` to `TIER_BORDER` map with cyan glow border, add shimmer |
| `src/index.css` | Add diamond-specific keyframe animations |

