

# Center BB Coin Image to Fill the Circle

## Problem

With `objectFit: 'contain'`, the square PNG is scaled to fit entirely inside the circular container. Since the container is clipped to a circle (via `borderRadius: 50%`), the image gets scaled down to fit within the inscribed area, leaving black gaps around the coin edges. The coin appears smaller than the circular frame.

## Solution

Change `objectFit` from `contain` back to `cover` on the front face image. Since we already removed the border from the front face in the previous fix, there is no longer a double-border issue. With `cover`:

- The image scales to fill the entire circular area edge-to-edge
- The black corners of the square PNG are naturally clipped by `borderRadius: 50%`
- The circular coin design perfectly fills the circular container
- The gold rim of the coin aligns flush with the edge of the frame

### File: `src/components/economy/RotatingBBCoin.tsx`

**Single change on line 73:**

Change:
```
objectFit: 'contain'
```
To:
```
objectFit: 'cover'
```

This is safe now because the previous fix already removed the CSS border from the front face, so there is no space being consumed by a component border. The coin's own built-in gold rim becomes the outermost visual edge.

## Files Modified

| File | Change |
|------|--------|
| `src/components/economy/RotatingBBCoin.tsx` | Change front face image objectFit from `contain` to `cover` |

