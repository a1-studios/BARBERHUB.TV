## Goal
Make the homepage globe feel like a real interactive map on mobile: pinch-to-zoom, one-finger drag to rotate, and tapping any marker reveals an info card that teases booking + "find a barber near you".

## Changes — `src/components/ui/cobe-globe-pulse.tsx`

### 1. Enable drag-to-rotate + pinch-to-zoom
- Add a `zoomRef` (1.0 default, clamped 0.85–2.2) and a `dragRef` to track pointer state.
- Attach `onPointerDown / Move / Up`, `onTouchStart / Move / End`, and `onWheel` to the container.
  - 1 pointer = rotate: update `phiOffsetRef` (Δx) and `thetaOffsetRef` (Δy, clamped ±0.7).
  - 2 touch points = pinch: track distance ratio → `zoomRef`.
  - Wheel = desktop zoom.
- Cancel auto-rotation while user is interacting (set `targetPhiOffsetRef` to null and freeze `speed` via an `isInteractingRef`; resume after 2.5s idle).
- Apply zoom by scaling the canvas wrapper with `transform: scale(zoom)` (cheaper than re-rendering Cobe) and multiply marker projection `radius * 0.9 * zoom`.
- Set canvas `touch-action: none` (already there) and container `touch-action: none` so the page doesn't scroll while dragging the globe.

### 2. Tap → richer "tease" info card
Replace the tiny bottom pill `chip` with a proper card anchored bottom-center of the globe:
- City, country flag + name (big).
- One-line tease: "Live barbers nearby · tap to discover".
- Two CTAs:
  - **Find Barbers Near You** → `navigate('/find-barbers')`
  - **Book Now** → `navigate('/booking')` (fallback `/find-barbers` if route missing — verify in code).
- Stays open until user taps outside / another marker / 6s timeout (up from 2.2s).
- `pointer-events-auto` on the card so buttons are tappable.
- Use design tokens (`bg-card/90 backdrop-blur border-border text-foreground`, accent = orange via existing classes).

### 3. Mobile tap reliability
- Increase invisible hit-area from `w-7 h-7` to `w-10 h-10` on mobile (`md:w-7 md:h-7`).
- Remove `onTouchStart` handler — it double-fires with `onClick` on iOS, causing flicker. Keep only `onClick`; iOS will synthesize click from tap. Add `e.stopPropagation()` so the container's drag listener doesn't swallow it (treat a pointer event as a tap if movement < 6px and duration < 250ms).

### 4. Mobile perf
- Throttle `projectGroup` to every 3rd frame on mobile (currently every 2nd).
- Lower `mapSamples` from 6000 → 5000 on mobile.

## Out of scope
- Changing the globe data source.
- Adding new routes.
- Desktop layout (changes are additive — desktop keeps wheel zoom + drag).

## Verification
1. Switch preview to mobile viewport (390×844). Pinch with two-finger gesture in browser devtools touch mode → globe scales smoothly.
2. Drag globe with one finger → rotates; releases → resumes auto-spin after ~2.5s.
3. Tap a flag marker → info card appears with city + 2 CTAs; tapping "Find Barbers Near You" navigates to `/find-barbers`.
4. Confirm no horizontal page scroll occurs while interacting.
