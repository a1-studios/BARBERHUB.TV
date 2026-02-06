

# Fix Back Face - Use Plain HTML Instead of Radix Avatar

## Root Cause

The Radix `Avatar` component uses internal JavaScript to detect image loading status (`onLoadingStatusChange`). Inside a CSS 3D transform context (`preserve-3d` + `rotateY(180deg)` + `backfaceVisibility: hidden`), this detection can fail silently, causing:
- The `AvatarImage` never transitions to "loaded" state, so it stays hidden
- The `AvatarFallback` has a built-in render delay, and its amber-on-amber text is nearly invisible at small sizes

Meanwhile, the front face works perfectly because it uses a plain `<img>` tag with no state management.

## Solution

Replace the Radix `Avatar`/`AvatarImage`/`AvatarFallback` with plain HTML elements in the `AvatarFace` component, matching the front face's approach:

- Use a plain `<img>` tag for the user's avatar photo (with `onError` fallback)
- Use a plain `<div>` for the initial letter fallback
- Track image load state with a simple `useState` + `onLoad`/`onError`

This sidesteps all Radix quirks inside 3D transforms.

---

## Technical Changes

### File: `src/components/economy/RotatingBBCoin.tsx`

**Rewrite `AvatarFace` to use plain HTML:**

```tsx
const AvatarFace = ({ pixelSize, avatarUrl, initial, animate }) => {
  const rimWidth = Math.max(2, pixelSize * 0.06);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const showImage = avatarUrl && !imgError;

  return (
    <div style={{
      width: pixelSize, height: pixelSize,
      backfaceVisibility: 'hidden',
      transform: 'rotateY(180deg)',
      // ... shadows
    }}>
      {/* Plain img for avatar photo */}
      {showImage && (
        <img
          src={avatarUrl}
          alt="Profile"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          style={{
            width: pixelSize, height: pixelSize,
            objectFit: 'cover',
            opacity: imgLoaded ? 1 : 0,
          }}
        />
      )}

      {/* Plain div fallback with high-contrast initial */}
      {(!showImage || !imgLoaded) && (
        <div style={{
          width: pixelSize, height: pixelSize,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          color: '#F5C518',
          fontSize: pixelSize * 0.4,
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {initial}
        </div>
      )}

      {/* Gold rim overlay (unchanged) */}
      {/* Specular + Shine overlays (unchanged) */}
    </div>
  );
};
```

**Key improvements:**

| Element | Before (broken) | After (fixed) |
|---------|-----------------|---------------|
| Avatar image | Radix `AvatarImage` (internal load detection fails in 3D) | Plain `<img>` with `onLoad`/`onError` |
| Fallback | Radix `AvatarFallback` (delayed render, low contrast amber-on-amber) | Plain `<div>` (immediate render, gold text on dark blue background) |
| State management | Radix internal (opaque, fails in 3D) | Simple `useState` (transparent, reliable) |
| Fallback colors | `text-amber-200` on `from-amber-800 to-amber-950` (barely visible) | Gold `#F5C518` on dark blue `#1a1a2e` (high contrast, matches coin theme) |
| Import needed | `Avatar, AvatarImage, AvatarFallback` from Radix | `useState` from React (already imported) |

**Also remove the Radix Avatar import** since it's no longer used in this component.

---

## Why This Works

The front face already proves that plain `<img>` renders perfectly inside the 3D transform:
```tsx
{/* Front face - works great */}
<img src={bbCoinLogo} className="w-full h-full object-cover rounded-full" />
```

The back face just needs the same approach but with dynamic `src` (user avatar) and a fallback state.

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/economy/RotatingBBCoin.tsx` | Replace Radix Avatar with plain `<img>` + `<div>` fallback in `AvatarFace`; add `useState` import; remove Avatar imports |

No changes needed to any consumer components -- the `RotatingBBCoinProps` interface stays identical.
