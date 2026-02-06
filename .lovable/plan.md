

# Remove Demo Battle Badge

## What Changes

Remove the pulsing "DEMO BATTLE" badge that appears at the top center of the Arena when no real voting battle is active.

## Change

**File: `src/components/DynamicBattleHero.tsx`**

Delete the `showDemoMode` badge block (approximately lines 186-193) -- the `motion.div` that renders the "⚡ DEMO BATTLE ⚡" text with the pulsing scale animation.

Everything else about demo mode behavior stays intact (vote buttons still appear, progress bar still shows). Only the floating badge label is removed.

## Files Modified

| File | Change |
|------|--------|
| `src/components/DynamicBattleHero.tsx` | Remove the "DEMO BATTLE" badge `motion.div` block |

