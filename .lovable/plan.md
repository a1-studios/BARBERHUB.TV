

# WatchFeed Endless Scroll + Homepage Hero Refinements

## Changes

### 1. WatchFeed: Restore endless scroll with looping videos
**File: `src/pages/WatchFeed.tsx`**
- Add `loop` back to all `<video>` elements in `renderVideoItem` so videos play continuously (no replay overlay needed — remove `onEnded` and replay state)
- The sponsor cards are already interleaved and already say "Powered by" — confirm the `link` prop opens to external pages correctly (the current `<a href>` with `target="_blank"` already does this)
- The feed structure with interleaved sponsors, educator, platform, and battle content is already in place — no structural changes needed

### 2. Homepage hero: Make video taller + clickable + remove badge
**File: `src/components/DynamicBattleHero.tsx`** (lines 278-322)
- Change `aspect-video` (16:9) to a taller aspect ratio like `aspect-[9/14]` on mobile for ~30% more vertical space, keep `aspect-video` on desktop via responsive class
- Remove the "Featured Barber" badge (lines 316-319)
- Wrap the entire video container in an `onClick={() => navigate('/watch')}` so tapping takes users to the watch feed

### Files to modify
| File | What |
|------|------|
| `src/pages/WatchFeed.tsx` | Add `loop` to videos, remove ended/replay logic |
| `src/components/DynamicBattleHero.tsx` | Taller aspect ratio, remove badge, add click-to-navigate |

