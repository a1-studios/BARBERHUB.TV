

# Rebuild RotatingBBCoin - Clean 3D Coin with New Logo

## Overview

Complete rewrite of the RotatingBBCoin component using a smarter, cleaner approach. The new coin image (image-9.png) already contains its own gold rim, Greek meander pattern, and center logo -- so the front face should render the image directly without any CSS rim/ring layers doubling up. The edge styling will match the thick, polished, beveled gold look from the reference image.

---

## Step 1: Replace the Logo Asset

Copy `user-uploads://image-9.png` to `src/assets/bb-coin-logo.png`, replacing the current file. This image already includes the complete coin face design (gold rim + pattern border + BB logo on black center).

---

## Step 2: Rewrite `src/components/economy/RotatingBBCoin.tsx`

### Architecture: 3 Clean Elements

Instead of the current complex layering (8 edge divs + nested rim/ring/center divs duplicated for both faces), the new approach uses just 3 core pieces:

```text
┌─────────────────────────────────────────────────┐
│  1. FRONT FACE (Z = 0)                          │
│     - Image rendered directly, no CSS rim layers │
│     - backfaceVisibility: hidden                 │
│     - Specular highlight + shine sweep overlays  │
│                                                  │
│  2. EDGE RING (multiple layers at Z offsets)     │
│     - Polished gold gradient matching reference  │
│     - Smooth beveled shading (lighter center,    │
│       darker at front/back)                      │
│     - Subtle ridged texture via box-shadow       │
│                                                  │
│  3. BACK FACE (rotateY 180deg)                   │
│     - CSS-built rim (bronze gradient)            │
│     - User avatar in center                      │
│     - Same specular + shine effects              │
└─────────────────────────────────────────────────┘
```

### Front Face (Simplified)

Since the new image IS the complete coin face, remove all CSS rim, inner ring, and center padding layers:

```tsx
{/* Front Face - Full coin image */}
<div style={{ backfaceVisibility: 'hidden' }}>
  <img
    src={bbCoinLogo}
    alt="BB Coin"
    className="w-full h-full object-cover rounded-full"
  />
  {/* Specular highlight overlay */}
  {/* Animated shine sweep */}
</div>
```

No `transform: scale()` needed -- the image fills the face naturally.

### Edge Layers (Polished Gold Style from Reference)

Keep the multi-layer approach but refine the colors to match the reference image's thick polished gold look:

| Layer Position | Color |
|----------------|-------|
| Front layers (0-1) | Darker bronze `#8B6914` to `#A67C00` -- shadow from front face lip |
| Middle layers (2-5) | Bright polished gold `#D4A017` to `#F5C518` -- main visible edge |
| Back layers (6-7) | Darker bronze again -- shadow toward back face |

This creates the smooth, rounded bevel visible in the reference.

### Back Face (Avatar - Unchanged Structure)

The back face still needs CSS-built layers since it renders dynamic content (user avatar):
- Bronze gradient rim
- Dark metallic inner ring  
- Center area with Avatar component and fallback initial
- Specular highlight + shine sweep

### Shared CoinFace Helper

Extract a reusable function for the back face's rim/ring/center structure + overlays to reduce code duplication. The front face won't use it since it's just an image.

### Props Interface (Unchanged)

```tsx
interface RotatingBBCoinProps {
  avatarUrl?: string | null;
  displayName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  onClick?: () => void;
}
```

All 5 consumer files (Header, BBWalletWidget, BBWalletCard, BarberProfileHeader, AddFundsModal) continue to work without changes.

---

## What Changes vs What Stays

| Element | Before | After |
|---------|--------|-------|
| Logo asset | Old small BB logo | New full coin face image (gold rim + Greek pattern + logo) |
| Front face | CSS rim + inner ring + center + scaled image | Image rendered directly (no CSS layers) |
| Front face centering | `transform: scale(1.15)` hack | `object-fit: cover` -- naturally centered |
| Edge layers | 8 layers, copper/brown colors | 8 layers, polished gold colors matching reference |
| Edge bevel | Basic dark/light alternation | Smooth gradient: dark front, bright middle, dark back |
| Back face | CSS rim + avatar (complex nesting) | Same structure, extracted into helper |
| Code size | ~254 lines with duplication | ~180 lines with shared helper |
| Props interface | No change | No change |
| Animation (rotation) | 6s Y-axis, linear | No change |
| Animation (shine) | 3s sweep with delay | No change |
| Drop shadow | Elliptical blur below | No change |

---

## Files Modified

| File | Change |
|------|--------|
| `src/assets/bb-coin-logo.png` | Replaced with new uploaded image (image-9.png) |
| `src/components/economy/RotatingBBCoin.tsx` | Full rewrite: simplified front face (image only), polished gold edge colors, shared helper for back face |

No changes needed to any consumer components -- the interface stays identical.

