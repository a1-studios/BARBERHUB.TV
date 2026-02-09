

## Fix: Add Small Gap to Prevent Header-Video Overlap

### Problem

The header uses `mt-2` (8px margin-top) and a 2px border, making its total height ~76px on mobile and ~88px on desktop. The current spacer (`h-16 sm:h-20` = 64px / 80px) doesn't fully clear the header, causing the battle arena to overlap slightly.

### Solution

Bump the spacer height up by one Tailwind step:

- Change `h-16 sm:h-20` to `h-20 sm:h-24` (80px / 96px)

This adds just enough clearance (~4-8px gap) without reintroducing the large gap from before.

### Changes

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Change header spacer from `h-16 sm:h-20` to `h-20 sm:h-24` |

### Visual Result

```text
Before (overlapping): Header (76px) vs Spacer (64px) = -12px overlap
After:                 Header (76px) vs Spacer (80px) =  +4px gap
```

