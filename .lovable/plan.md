

## Fix: Reduce Padding Between Header and Battle Arena

### Problem

There is too much vertical space between the BARBER-HUB header and the battle arena video section. Two sources of padding stack up:

1. `Index.tsx` line 35: `<div className="h-24 sm:h-28" />` -- spacer for the fixed header
2. `DynamicBattleHero.tsx` line 255: `pt-8 sm:pt-12` -- additional top padding on the arena container

Together these create roughly 128px+ of dead space. The desired result (shown in the second screenshot) has the video sitting almost directly below the header with minimal gap.

### Solution

Reduce the spacing in two places:

1. **Index.tsx** -- Shrink the header spacer from `h-24 sm:h-28` to `h-16 sm:h-20` (just enough to clear the fixed header)
2. **DynamicBattleHero.tsx** -- Remove the extra top padding from `pt-8 sm:pt-12` down to `pt-1 sm:pt-2` on the arena wrapper

This brings the video content tight against the header, matching the desired layout in the second screenshot.

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Change header spacer from `h-24 sm:h-28` to `h-16 sm:h-20` |
| `src/components/DynamicBattleHero.tsx` | Change arena wrapper padding from `pt-8 sm:pt-12` to `pt-1 sm:pt-2` in main return and both fallback returns |

### Visual Result

```text
Before:  Header -> 96px spacer -> 32px padding -> Video  (128px+ total gap)
After:   Header -> 64px spacer ->  4px padding -> Video  ( 68px total gap)
```

