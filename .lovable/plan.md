## Plan

### 1. `VelvetRopeLanding.tsx` — breathing space
- Add `mt-3` (or `pt-3`) gap between the header card and the FeatureHighlightReel container so the reel no longer kisses the header.

### 2. `FeatureHighlightReel.tsx` — manual control + clean globe
- Remove auto-advance `useEffect` / `setTimeout`. Slides only change via swipe or dot click.
- Add touch swipe handlers (`onTouchStart` / `onTouchEnd`, ~50px threshold) on the slide container for left/right navigation.
- Keep dots clickable (already done) — make them larger tap targets.
- For the `global` slide ONLY: remove the `SlideShell` wrapper (no top tag chip, no bottom title/sub bar, no inner radial background box). Render the globe full-bleed inside the reel card so the user has maximum room to drag it. The orbiting slogan handles the messaging.
- Remove the `LegendsHeadline` slogan overlay from the top of the reel (it currently covers all slides).

### 3. New `OrbitingSlogan.tsx` (rendered inside the globe slide)
- Words "WHERE · BARBERS · BECOME · LEGENDS · ★ ·" rotating in a circle around the 3D globe using SVG `<textPath>` on a `<circle>` with a CSS `@keyframes spin` animation (~30s linear infinite).
- Positioned absolutely, centered on the globe, `pointer-events-none` so it never blocks globe dragging.
- Orange for WHERE/BECOME, white for BARBERS/LEGENDS to preserve the existing two-color logic.
- Only renders on the globe slide (so other slides keep their own titles).

### 4. `LegendsHeadline.tsx`
- No longer used on the landing; leave file in place (still imported elsewhere potentially) but remove its usage from the reel & landing.

### Technical notes
- Swipe detection: track `touchStartX` in a ref; on touchend compare delta; `(idx + dir + slides.length) % slides.length`.
- SVG textPath orbit: viewBox 0 0 400 400, circle r≈170, rotating group via `transform-origin: center; animation: orbit 28s linear infinite`.
- Globe slide structure becomes: `<div class="absolute inset-0"> <GlobePulse /> <OrbitingSlogan /> </div>` — no chrome.
- Non-globe slides keep their existing `SlideShell` with tag + title + subtitle.
