

# Rebuild Barber Coin - Follow the Logic Blueprint

## Problem

The coin's back face (profile side) has been broken through multiple fix attempts. The root cause is over-engineering: complex nested layers, edge gradients, and box-shadow rims create rendering conflicts inside CSS 3D transforms. The user's screenshots show the profile side appearing as a tiny unreadable golden dot.

## Solution

Rewrite the `RotatingBBCoin` component following the user's "Logic Blueprint" approach -- a cleaner, simpler CSS 3D coin flip that reliably renders both faces at full size.

---

## Technical Changes

### File: `src/components/economy/RotatingBBCoin.tsx`

**Complete rewrite of the component internals while preserving the existing props interface** (so all 6 consumer files continue working unchanged).

### 1. Simplify the coin structure

Replace the 8-layer edge system and complex box-shadow rims with the blueprint's simpler approach:

```text
Current (broken):
  perspective container
    motion.div (preserve-3d, auto-rotate 360)
      8x edge layer divs (translateZ)
      front face (inset-0, box-shadow)
      AvatarFace (rotateY 180, box-shadow rim, specular, shine)

New (blueprint-aligned):
  perspective container
    motion.div (preserve-3d, auto-rotate OR click-flip)
      FRONT face div (backface-hidden, gold border, shadow)
        BB logo img (full size)
      BACK face div (backface-hidden, rotateY 180, gold border, shadow)
        User avatar img OR initial fallback (full size)
        Metallic engraving overlay (gold gradient, low opacity)
```

### 2. Front face -- keep the BB logo

```tsx
<div style={{
  position: 'absolute',
  width: pixelSize, height: pixelSize,
  backfaceVisibility: 'hidden',
  borderRadius: '50%',
  border: `${borderWidth}px solid #B8860B`,
  boxShadow: '0 4px 15px rgba(0,0,0,0.4), inset 0 1px 3px rgba(255,255,255,0.2)',
  overflow: 'hidden',
}}>
  <img src={bbCoinLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
</div>
```

### 3. Back face -- user profile with engraved look (from blueprint)

Use plain `<img>` (no Radix Avatar) with the blueprint's metallic overlay:

```tsx
<div style={{
  position: 'absolute',
  width: pixelSize, height: pixelSize,
  backfaceVisibility: 'hidden',
  transform: 'rotateY(180deg)',
  borderRadius: '50%',
  border: `${borderWidth}px solid #B8860B`,
  boxShadow: '0 4px 15px rgba(0,0,0,0.4), inset 0 1px 3px rgba(255,255,255,0.2)',
  overflow: 'hidden',
  background: '#111',
}}>
  {/* User avatar - full size */}
  {showImage ? (
    <img src={avatarUrl}
      style={{ width: '100%', height: '100%', objectFit: 'cover',
               opacity: 0.85, filter: 'contrast(1.2) saturate(0.8)' }}
    />
  ) : (
    <div /* fallback initial letter, gold on dark blue */ />
  )}

  {/* Engraving overlay - gold gradient from blueprint */}
  <div style={{
    position: 'absolute', inset: 0, borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(184,134,11,0.3) 0%, transparent 60%)',
    pointerEvents: 'none',
  }} />
</div>
```

The key differences from the broken version:
- Uses `border` for the rim (reliable with `border-radius`) instead of `box-shadow inset` layers
- Avatar rendered at `width: 100%` / `height: 100%` inside the bordered container -- no absolute positioning conflicts
- Metallic overlay uses `opacity: 0.85` + `contrast(1.2)` + `saturate(0.8)` for the "engraved on coin" look
- Gold gradient overlay on top for the engraving effect
- No edge layers, no specular highlights, no shine sweeps -- just clean, working renders

### 4. Keep auto-rotate behavior (backward compatible)

The `animate` prop continues to work for continuous rotation:

```tsx
<motion.div
  style={{ transformStyle: 'preserve-3d', width: pixelSize, height: pixelSize }}
  animate={animate ? { rotateY: 360 } : undefined}
  transition={animate ? { duration: 6, repeat: Infinity, ease: 'linear' } : undefined}
>
```

All 6 consumer files pass `animate={true}`, so this stays the same.

### 5. Maintain the exact same props interface

```tsx
interface RotatingBBCoinProps {
  avatarUrl?: string | null;   // unchanged
  displayName?: string;         // unchanged
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';  // unchanged
  animate?: boolean;            // unchanged
  onClick?: () => void;         // unchanged
}
```

Zero changes needed in any consumer component.

---

## What Gets Removed (Simplification)

| Removed Element | Why |
|----------------|-----|
| 8 edge layer divs with `translateZ` | Over-engineered, causes z-fighting and rendering glitches |
| `getEdgeGradient` function | No longer needed without edge layers |
| `SpecularHighlight` component | Unnecessary complexity, adds visual noise at small sizes |
| `ShineSweep` animated component | Unnecessary, conflicts with 3D transforms |
| `AvatarFace` sub-component | Replaced by inline back face div (simpler, no abstraction needed) |
| Drop shadow ellipse div | Replaced by standard `box-shadow` on the coin |
| `box-shadow inset` rim approach | Replaced by reliable `border` property |

## What Gets Added

| New Element | Purpose |
|------------|---------|
| Metallic filter on avatar | `opacity: 0.85`, `contrast(1.2)`, `saturate(0.8)` -- makes avatar look "printed" on the coin |
| Gold engraving overlay | `linear-gradient` from gold/transparent -- from the blueprint |
| Simple `border` rim | Reliable gold border that works with `border-radius` in all contexts |

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/economy/RotatingBBCoin.tsx` | Full rewrite of internals following the blueprint; same props interface |

No changes to consumer files: `Header.tsx`, `BBWalletCard.tsx`, `BBWalletWidget.tsx`, `AddFundsModal.tsx`, `BarberProfileHeader.tsx`.
