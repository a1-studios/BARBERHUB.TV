

## Fix: Increase Header-Video Spacing One More Step

### Problem

The current spacer (`h-20 sm:h-24`) still doesn't provide enough clearance between the header and the battle arena video.

### Solution

Bump the spacer up by the same increment as last time (one Tailwind step = +16px):

- Change `h-20 sm:h-24` to `h-24 sm:h-28` (96px / 112px)

### Changes

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Change header spacer from `h-20 sm:h-24` to `h-24 sm:h-28` |

