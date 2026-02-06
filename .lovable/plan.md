

# Fix Back Face Avatar Size to Match Front Face

## Problem

The back face of the coin (user avatar) appears smaller than the front face (BB logo) because of nested CSS padding layers:

- **Front face**: Image fills the entire coin face edge-to-edge using `inset-0` + `object-cover`
- **Back face**: Has `padding: 4%` (rim) + `padding: 2%` (inner ring) = avatar is ~12% smaller overall

This creates a visible size mismatch when the coin rotates.

## Solution

Restructure the back face to match the front face approach: render the avatar edge-to-edge as the primary content, then overlay a thin gold rim border **on top** instead of using padding to shrink the content inward. This way both faces occupy the exact same visual area.

---

## Technical Changes

### File: `src/components/economy/RotatingBBCoin.tsx`

**Rewrite the `AvatarFace` component:**

Current structure (shrinks content):
```text
Outer div (padding: 4%) 
  Inner ring div (padding: 2%)
    Center div
      Avatar (shrunk by ~12%)
```

New structure (full-size content with overlay border):
```text
Outer div (no padding, same as front face)
  Avatar (fills entire face, object-cover)
  Gold rim overlay (absolute, pointer-events-none, border only)
  Specular highlight overlay
  Shine sweep overlay
```

Key changes:
1. Remove `padding: rimWidth` from outer container -- use `inset-0` like the front face
2. Remove the inner ring `div` wrapper entirely
3. Render the Avatar at full size with `object-cover` to fill the coin face
4. Add a circular gold border as an overlay using `border` + `box-shadow` on an absolutely positioned div (pointer-events-none) -- this gives the coin edge look without shrinking the avatar
5. Keep the fallback initial letter for users without a profile photo

The back face will now match the front face in visual size while still showing the gold rim as a decorative overlay.

---

## Visual Comparison

**Before (mismatched sizes):**
```text
FRONT (full)          BACK (smaller)
┌──────────────┐      ┌──────────────┐
│              │      │  ┌────────┐  │
│   BB LOGO    │      │  │ Avatar │  │
│  (edge-to-  │      │  │(shrunk)│  │
│   edge)      │      │  └────────┘  │
│              │      │   rim+ring   │
└──────────────┘      └──────────────┘
```

**After (matched sizes):**
```text
FRONT (full)          BACK (full)
┌──────────────┐      ┌──────────────┐
│              │      │              │
│   BB LOGO    │      │   AVATAR     │
│  (edge-to-  │      │  (edge-to-  │
│   edge)      │      │   edge)      │
│              │      │  + rim overlay│
└──────────────┘      └──────────────┘
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/economy/RotatingBBCoin.tsx` | Rewrite `AvatarFace` to render avatar full-size with gold rim as an overlay instead of padding-based shrinking |

No changes to any consumer components -- props stay identical.

