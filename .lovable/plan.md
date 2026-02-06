
# Fix Coin Edge Thickness & Enlarge BB Logo

## Issues to Fix

1. **Hollow Edge**: Currently only one edge layer at `translateZ(-4px)` - need multiple stacked layers for solid 3D thickness
2. **Small Logo**: The BB logo image is too small due to cumulative padding from rim (6%) + inner ring (3%) - need to reduce these to make the center image larger

---

## Technical Changes

### File: `src/components/economy/RotatingBBCoin.tsx`

**1. Add Multiple Edge Layers for Solid Thickness**

Replace single edge layer with 8 stacked layers:
```tsx
// Edge configuration
const edgeDepth = Math.max(6, pixelSize * 0.15);
const edgeLayers = 8;

// Render stacked edge layers
{Array.from({ length: edgeLayers }).map((_, i) => (
  <div
    key={i}
    className="absolute rounded-full"
    style={{
      width: pixelSize - 2,
      height: pixelSize - 2,
      left: 1,
      top: 1,
      background: getEdgeColor(i, edgeLayers), // Beveled shading
      transform: `translateZ(${-((i + 1) * (edgeDepth / edgeLayers))}px)`,
    }}
  />
))}
```

**2. Add Beveled Edge Color Function**
```tsx
const getEdgeColor = (index: number, total: number) => {
  // Darker at front/back edges, lighter in middle for bevel effect
  if (index < 2) {
    return 'linear-gradient(90deg, #5C3D2E 0%, #8B5A2B 50%, #5C3D2E 100%)';
  }
  if (index >= total - 2) {
    return 'linear-gradient(90deg, #5C3D2E 0%, #8B5A2B 50%, #5C3D2E 100%)';
  }
  return copperEdgeGradient;
};
```

**3. Reduce Rim/Ring Padding to Enlarge Logo by ~15%**

Update proportions to show more of the center image:
```tsx
const getProportions = (size: number) => ({
  rimWidth: Math.max(1, size * 0.04),      // Was 0.06 → 0.04 (reduced)
  innerRingWidth: Math.max(1, size * 0.02), // Was 0.03 → 0.02 (reduced)
  centerSize: size * 0.82,                  // Was 0.7 → 0.82 (~15% increase)
  edgeThickness: Math.max(3, size * 0.08),
});
```

**4. Scale Logo Image Beyond Container**

Add `transform: scale(1.15)` to the logo image for additional enlargement:
```tsx
<img
  src={bbCoinLogo}
  alt="BB Coin"
  className="w-full h-full object-cover"
  style={{
    transform: 'scale(1.15)',  // 15% larger
    filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))',
  }}
/>
```

---

## Visual Result

**Before:**
```text
┌──────────────────┐
│ ████████████████ │  ← Thick rim (6%)
│ ██ ┌────────┐ ██ │  ← Thick inner ring (3%)
│ ██ │   BB   │ ██ │  ← Small logo
│ ██ │  LOGO  │ ██ │
│ ██ └────────┘ ██ │
│ ████████████████ │
└──────────────────┘
   Gap (hollow)
```

**After:**
```text
┌──────────────────┐
│ ██████████████ │  ← Thinner rim (4%)
│ █ ┌──────────┐ █ │  ← Thinner ring (2%)
│ █ │    BB    │ █ │  ← Larger logo (+15%)
│ █ │   LOGO   │ █ │
│ █ └──────────┘ █ │
│ ██████████████ │
├──────────────────┤  ← 8 solid edge layers
├──────────────────┤
├──────────────────┤
└──────────────────┘
```

---

## Summary

| Change | Before | After |
|--------|--------|-------|
| Edge layers | 1 (hollow) | 8 (solid) |
| Rim width | 6% | 4% |
| Inner ring | 3% | 2% |
| Logo scale | 100% | 115% |
| Total logo visibility | ~70% | ~85% |

---

## File Modified

| File | Changes |
|------|---------|
| `src/components/economy/RotatingBBCoin.tsx` | Add multiple edge layers for solid thickness, reduce rim/ring padding, scale logo image 15% larger |
