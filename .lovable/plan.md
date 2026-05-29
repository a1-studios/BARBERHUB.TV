## Plan

### 1. `OrbitingSlogan.tsx` — tilted 3D halo ring
- Tilt the orbit ring on the X-axis to read as a 3D angel halo around the globe instead of a flat 2D circle.
- Wrap the SVG in a perspective container: outer `div` with `style={{ perspective: '800px' }}`.
- Inner SVG gets `transform: rotateX(72deg)` (steep tilt so it reads as a ring around the equator from a slight top view) and the existing `orbit-spin` rotation runs on a child `<g>` instead of the whole SVG so rotation happens in the tilted plane.
- Switch the spin from CSS rotate (which only rotates 2D) to SMIL `<animateTransform>` inside the SVG `<g>`, so it spins inside the tilted plane and properly orbits around the globe like a ring.
- Increase radius slightly and reduce font size so the text wraps cleanly along the tilted ellipse.

### 2. `FeatureHighlightReel.tsx` — transparent globe slide, no card
- For the `global` slide specifically, render OUTSIDE the bordered card chrome. Approach: detect when `idx === 0` and conditionally drop the border + shadow + background on the reel container, or render the globe slide as a sibling that overlays full-bleed with no border.
- Cleanest implementation: remove the slide's inner `bg-black` wrapper, and on the outer reel container apply conditional classes — when current slide is `global`, use `border-transparent bg-transparent shadow-none`; otherwise keep `border-orange-500/30 bg-black/60 shadow-[0_0_24px_rgba(249,115,22,0.25)]`.

### 3. `VelvetRopeLanding.tsx` — more breathing space
- Increase the gap between the header and the feature reel container. Change the reel wrapper's `pt-4` to `pt-8` (and add `mt-2` on the wrapper) so there's a clear visual separation.

### Technical notes
- SMIL animateTransform: `<animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="32s" repeatCount="indefinite" />` applied to the rotating `<g>` containing the textPath.
- Tilted plane uses CSS `transform: rotateX(72deg)` on the SVG; the SVG itself doesn't spin — only the inner group spins via SMIL, which keeps the spin axis perpendicular to the tilted ring (true halo effect).
- Globe slide becomes background-free so the globe floats directly over the page's dark background with no card border around it.
