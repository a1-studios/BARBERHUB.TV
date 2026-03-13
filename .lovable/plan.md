

## Fix M4M Heart: Interactivity, Visibility, and Glow States

### Problems Identified
1. **Click not working**: The SVG `<g>` wrapping the M4M heart has `onClick` but the heart paths use `fill="none"` — clicks on empty space inside the heart outline pass through. Need an invisible hit-area rectangle.
2. **Too faint**: Ghost state is at 15% opacity — nearly invisible against dark backgrounds.
3. **Color too dark**: Zion Blue (`#002D62`) is a deep navy that doesn't glow well. Needs a bright, electric color.

### Changes — `src/components/AvatarCrest.tsx`

**A) Add hit-area to M4M heart click zone**
- Insert a transparent `<rect>` behind the heart SVG paths inside the `<g onClick={handleM4MClick}>` so clicks register on the entire bounding box, not just stroke paths.
- Add `style={{ pointerEvents: 'all' }}` to the `<g>`.

**B) Change M4M color from navy to bright cyan**
- Replace `ZION_BLUE (#002D62)` usage inside `M4MHeart` with a bright electric cyan: `#00E5FF` (or similar high-visibility glow color).
- Keep `ZION_BLUE` constant for other uses outside M4M if any.

**C) Increase ghost visibility**
- Bump ghost opacity from `0.15` → `0.3` so it's clearly visible as a faint heart outline.
- Use the bright cyan at low opacity so it reads as a "dormant" glow.

**D) Add certified flashing state**
- For `certified` state: wrap the heart `<g>` in a framer-motion `<motion.g>` with an intermittent flash animation — opacity oscillates between 0.4 and 1.0 every few seconds (not constant, more like a periodic blink/flash).
- Add a subtle cyan glow filter for the certified state.

**E) Make heart slightly larger**
- Increase `M4MHeart` scale multiplier from `0.35` → `0.45` so it's more prominent at the bottom of the crest.

### Visual Summary
```text
Ghost:      Bright cyan outline, 30% opacity, clearly visible but dormant
Certified:  Bright cyan, periodic flash/blink (0.4→1.0 opacity), subtle glow
Complete:   (future — keep current pulse logic but with cyan color)
```

### Files Changed
| File | Action |
|------|--------|
| `src/components/AvatarCrest.tsx` | Fix click hit-area, change color, increase size, add flash animation |

