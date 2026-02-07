

# Fix BB Coin Rendering Quality

## Problem

The BB coin logo image (`bb-coin-logo.png`) is a square PNG with a **black background** containing a circular coin design. When rendered at small sizes (xs=28px, sm=36px), several issues make it look bad:

1. **`objectFit: 'cover'` crops the coin** -- The image fills the circular frame edge-to-edge, cutting into the gold rim and Greek meander border detail of the coin design
2. **The component's gold border doubles up** with the coin image's own gold rim, creating an awkward double-border effect
3. **At tiny sizes** (xs/sm), the thick component border eats significant pixel space from the already-small image

## Solution

Adjust the `RotatingBBCoin` component rendering so the coin image displays correctly at all sizes.

### File: `src/components/economy/RotatingBBCoin.tsx`

**1. Change front face image fit from `cover` to `contain`**

Switch `objectFit: 'cover'` to `objectFit: 'contain'` on the logo image (line 62). This ensures the full circular coin design (including its own gold rim) is visible without being cropped.

**2. Add black background to the front face**

Add `background: '#000'` to the front face div so the black corners of the square PNG blend seamlessly with the face background, making the circular coin appear to float naturally inside the frame.

**3. Remove the component's own gold border on the front face**

The coin image already has its own detailed gold rim with the Greek meander pattern. The component's additional `border: Xpx solid #B8860B` creates an ugly double-rim effect. Remove the border from the front face style to let the coin's built-in rim be the only border.

**4. Keep the border on the back face only**

The back face (user avatar/initial) still needs the gold border since it doesn't have its own built-in rim.

**5. Refactor face styles to separate front and back**

Split `faceBase` into shared base properties plus separate front/back overrides:
- Shared: position, dimensions, backfaceVisibility, borderRadius, overflow, boxShadow
- Front only: no border, black background
- Back only: gold border, dark background

## What This Achieves

- The full coin design (gold outer rim, Greek meander inner ring, black center, BB logo) renders cleanly at all sizes
- No double-border effect at any size
- The coin looks crisp at xs (28px) through xl (96px)
- The back face retains its gold-bordered engraved look for avatars/initials

## Files Modified

| File | Change |
|------|--------|
| `src/components/economy/RotatingBBCoin.tsx` | Split face styles, remove front border, set contain + black bg for logo |

