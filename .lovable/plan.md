

# Add 3D Thickness to the Barber Coin

## Goal

Give the coin a realistic thick, 3D cylindrical edge that's visible when it rotates -- like a real coin you'd hold between your fingers.

## How It Works

Right now the coin is just two flat faces (front logo + back profile). When it rotates sideways, there's no visible edge -- it looks paper-thin. Real coins have a thick gold rim visible from the side.

The trick: stack multiple thin "edge slice" divs between the front and back faces at different Z-depths using CSS `translateZ`. When the coin turns, these slices merge visually into a solid gold edge.

```text
Current (paper-thin):
  [Front Face] ←→ [Back Face]

New (thick 3D):
  [Front Face]
    ↕ edge slice at Z=-1px
    ↕ edge slice at Z=-2px
    ↕ edge slice at Z=-3px
    ...
  [Back Face]
```

---

## Technical Changes

### File: `src/components/economy/RotatingBBCoin.tsx`

**1. Calculate edge thickness based on coin size**

Scale the edge depth proportionally so small coins (28px) get a subtle edge and large coins (96px) get a chunky one:

```tsx
const edgeDepth = Math.max(2, Math.round(pixelSize * 0.06));
// xs(28px) = 2px, sm(36px) = 2px, md(56px) = 3px, lg(72px) = 4px, xl(96px) = 6px
```

**2. Generate edge slice layers**

Create an array of thin circular divs, each pushed back by 1px in Z-space. Each gets a gold gradient that shifts slightly to simulate light hitting a curved metallic edge:

```tsx
const edgeLayers = Array.from({ length: edgeDepth }, (_, i) => (
  <div
    key={`edge-${i}`}
    style={{
      position: 'absolute',
      width: pixelSize,
      height: pixelSize,
      borderRadius: '50%',
      transform: `translateZ(${-(i + 1)}px)`,
      background: `linear-gradient(
        ${90 + (i * 15)}deg,
        #B8860B 0%, #DAA520 30%, #8B6914 60%, #B8860B 100%
      )`,
      // Slightly darker on deeper layers for depth illusion
      filter: `brightness(${1 - i * 0.05})`,
    }}
  />
));
```

**3. Position the front face forward**

Push the front face forward by half the edge depth so the edge is centered:

```tsx
// Front face
<div style={{
  ...faceBase,
  transform: `translateZ(${edgeDepth / 2}px)`,
}}>
```

**4. Position the back face backward**

Push the back face to the other end of the edge:

```tsx
// Back face
<div style={{
  ...faceBase,
  transform: `translateZ(${-edgeDepth / 2}px) rotateY(180deg)`,
}}>
```

**5. Add a subtle drop shadow beneath the coin**

A small elliptical shadow below the coin sells the "floating 3D object" illusion:

```tsx
<div style={{
  position: 'absolute',
  bottom: -4,
  left: '10%',
  width: '80%',
  height: 4,
  borderRadius: '50%',
  background: 'radial-gradient(ellipse, rgba(0,0,0,0.3), transparent)',
  pointerEvents: 'none',
}} />
```

**6. Upgrade the border to a gradient border**

Replace the flat `border: solid #B8860B` on each face with a richer multi-tone gold using a pseudo-approach via box-shadow:

```tsx
const faceBase: React.CSSProperties = {
  // ... existing properties
  border: `${borderWidth}px solid #B8860B`,
  boxShadow: `
    0 4px 15px rgba(0,0,0,0.4),
    inset 0 1px 3px rgba(255,255,255,0.2),
    inset 0 0 0 1px rgba(218,165,32,0.4)
  `,
};
```

The extra `inset 0 0 0 1px` adds a subtle inner gold highlight that catches the light.

---

## Summary of Changes

| Element | Purpose |
|---------|---------|
| Edge slice array (translateZ layers) | Creates visible gold thickness when coin rotates |
| Front face `translateZ(+half)` | Pushes front forward to center the edge |
| Back face `translateZ(-half)` | Pushes back backward to match |
| Gradient rotation per slice | Simulates light hitting a curved metallic surface |
| Brightness falloff on deeper slices | Adds depth perception to the edge |
| Drop shadow ellipse | Grounds the coin visually |

## Props Interface

No changes -- the same `RotatingBBCoinProps` interface. All consumer files continue working unchanged.

## Files Modified

| File | Change |
|------|--------|
| `src/components/economy/RotatingBBCoin.tsx` | Add edge thickness layers, offset faces in Z-space, add drop shadow |

