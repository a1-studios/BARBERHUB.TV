

# Fix Back Face Avatar Rendering & Sizing

## Problem

The coin's back face (user profile) is not rendering correctly — the avatar/fallback content appears as a tiny golden circle with no visible content. Two issues cause this:

1. **Radix Avatar defaults fight the layout**: The Avatar component has hardcoded `h-10 w-10` (40px) and `shrink-0` classes. While `tailwind-merge` handles the width/height override, `shrink-0` remains and can prevent proper sizing in flex contexts within 3D transforms.

2. **Percentage sizing breaks inside 3D transforms**: The back face uses `transform: rotateY(180deg)` inside a `preserve-3d` container. CSS `w-full`/`h-full` can behave unpredictably in this context because the parent's computed dimensions may not propagate correctly through 3D transform boundaries.

## Solution

Replace all percentage-based sizing in the `AvatarFace` component with explicit pixel values calculated from `pixelSize`, and override the Avatar's `shrink-0` class.

---

## Technical Changes

### File: `src/components/economy/RotatingBBCoin.tsx`

**Changes to `AvatarFace` component:**

1. **Set explicit pixel dimensions on the Avatar root** instead of `w-full h-full`:
   ```tsx
   <Avatar
     className="rounded-full"
     style={{ width: pixelSize, height: pixelSize, flexShrink: 1 }}
   >
   ```
   Using inline `style` with exact pixel values bypasses both the Radix default `h-10 w-10` and the `shrink-0` class. This guarantees the Avatar fills the coin face regardless of 3D transform context.

2. **Set explicit pixel dimensions on AvatarImage and AvatarFallback**:
   ```tsx
   <AvatarImage
     src={avatarUrl || undefined}
     className="object-cover"
     style={{ width: pixelSize, height: pixelSize }}
   />
   <AvatarFallback
     className="flex items-center justify-center bg-gradient-to-br from-amber-800 to-amber-950 text-amber-200 font-bold"
     style={{ width: pixelSize, height: pixelSize, fontSize: pixelSize * 0.35 }}
   >
     {initial}
   </AvatarFallback>
   ```

3. **Add explicit dimensions to the back face container div**:
   ```tsx
   <div
     className="absolute rounded-full overflow-hidden"
     style={{
       width: pixelSize,
       height: pixelSize,
       top: 0,
       left: 0,
       backfaceVisibility: 'hidden',
       transform: 'rotateY(180deg)',
       ...
     }}
   >
   ```
   Replace `inset-0` with explicit `width`/`height`/`top`/`left` to avoid percentage resolution issues in 3D space.

4. **Same explicit dimensions for the rim overlay div**:
   ```tsx
   <div
     className="absolute rounded-full pointer-events-none"
     style={{
       width: pixelSize,
       height: pixelSize,
       top: 0,
       left: 0,
       boxShadow: ...
     }}
   />
   ```

These changes ensure every element in the back face stack uses concrete pixel values that work correctly regardless of CSS 3D transform context.

---

## Why This Works

| Element | Before (broken) | After (fixed) |
|---------|-----------------|---------------|
| Back face container | `className="absolute inset-0"` (percentage-based) | `style={{ width: pixelSize, height: pixelSize }}` (pixel-based) |
| Avatar root | `className="w-full h-full"` + Radix `shrink-0` fighting | `style={{ width: pixelSize, height: pixelSize, flexShrink: 1 }}` |
| AvatarImage | `className="w-full h-full"` (relative to broken parent) | `style={{ width: pixelSize, height: pixelSize }}` |
| AvatarFallback | `className="w-full h-full"` (relative to broken parent) | `style={{ width: pixelSize, height: pixelSize }}` |
| Rim overlay | `className="absolute inset-0"` | `style={{ width: pixelSize, height: pixelSize }}` |

All elements now use the same `pixelSize` value that drives the front face, guaranteeing both faces render at identical dimensions.

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/economy/RotatingBBCoin.tsx` | Replace percentage-based sizing with explicit pixel dimensions in `AvatarFace` component |

No changes to consumer components or the Avatar UI component.
