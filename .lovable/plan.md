

## Fix: Flag Background Not Rendering Correctly + Avatar Too Close to Header

### Problems

1. **Flag background not showing correctly**: The flag image from `flagcdn.com` is rendered with `rotate-90 scale-150` which distorts many flags (especially tri-color vertical flags like Italy). The rotation approach doesn't work well for all flag aspect ratios.

2. **Avatar too close to header**: The hero section has only `pt-4` (16px) after the main container's `pt-16` (header offset). This puts the avatar nearly touching the header bar.

### Changes

#### 1. Fix flag background in `Profile.tsx` (lines 200-206)
Remove `rotate-90` from the flag image. Instead, use the flag at its natural orientation with `object-cover` and increase opacity slightly for better visibility. The rotation was causing distortion on many flags. A simple full-bleed cover without rotation looks better across all flag types.

#### 2. Add more top spacing in `Profile.tsx` (line 217)
Change the hero section padding from `pt-4` to `pt-8` to give breathing room between the header and the avatar.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/Profile.tsx` | Remove `rotate-90 scale-150` from flag img, use `object-cover` only; increase hero `pt-4` → `pt-8` |

