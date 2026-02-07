

# Fix BB Coin Centering and Fill

## Problem

The source PNG (`bb-coin-logo.png`) is a square image where the circular coin design is centered but has approximately 8-10% black padding on all sides. Since both `objectFit: 'cover'` and `objectFit: 'contain'` produce identical results for a square image inside a square container, neither approach fills the circular frame -- there is always a visible black gap between the coin's gold rim and the circular container edge.

## Solution

Scale the front face image slightly beyond 100% so the coin's outer gold rim aligns flush with the circular container boundary. Use CSS `transform: scale()` to enlarge the image while keeping it centered, and let the container's `overflow: hidden` + `borderRadius: 50%` clip the excess.

### File: `src/components/economy/RotatingBBCoin.tsx`

**Change the front face image styling (line 73):**

From:
```typescript
style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
```

To:
```typescript
style={{
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
  transform: 'scale(1.15)',
}}
```

The `scale(1.15)` value compensates for the ~8% black padding in the source PNG, pushing the coin's gold rim outward to meet the circular container edge. The container's `overflow: hidden` and `borderRadius: 50%` will clip any excess, and `transform` scales from center by default so the coin stays perfectly centered.

## Why This Works

- `transform: scale()` scales from the element's center by default -- no additional centering needed
- The container already has `overflow: hidden` and `borderRadius: 50%`, which clips the scaled-up black corners
- The coin's gold outer rim fills the full circular frame edge-to-edge
- Works consistently at all sizes (xs through xl) since the scale is proportional
- No changes needed to the back face -- it already has its own gold border

## Files Modified

| File | Change |
|------|--------|
| `src/components/economy/RotatingBBCoin.tsx` | Add `transform: scale(1.15)` to front face image to fill the circular container |

