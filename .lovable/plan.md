## Goal

Three small, focused fixes to the landing-page globe (`GlobePulse`):

1. Disable pinch-zoom entirely (and wheel-zoom) so the globe stays at a fixed scale at every aspect ratio.
2. Make the globe 20% bigger on tablet (md) and desktop (lg) breakpoints — mobile size unchanged.
3. Make sure the emoji flags stay glued to their real lat/lng on the globe as it rotates (no drift, no lag).

---

## Changes

### 1. `src/components/ui/cobe-globe-pulse.tsx` — disable zoom

- Remove the pinch branch from `onTouchStart` / `onTouchMove` / `onTouchEnd` (no `mode = "pinch"`, no `pinchStartDist`/`pinchStartZoom`). Two-finger touches are ignored; one-finger touch still drags-to-rotate.
- Remove the `onWheel` handler and its `addEventListener("wheel", ...)` registration. Desktop wheel no longer changes zoom (and page scroll is no longer blocked over the globe).
- Keep `zoomRef.current = 1` permanently. Remove the `setZoom` state and the unused `[, setZoom]` hook.
- Projection math in `projectGroup` and `hitTest` stays as-is (it already multiplies by `zoomRef.current`, which will now always be 1).

### 2. Fix flag-to-location sync (same file)

Right now, on mobile the projection is throttled to `frame % 3 === 0`, but the globe itself updates every frame. While the globe auto-spins (or the user drags), flags lag behind the surface and visibly "float" off their cities. Fix:

- Project flag overlays on **every** frame (remove the `frame % 3` throttle). This keeps emoji flags locked to their lat/lng at all times.
- Keep `mapSamples: isMobile ? 5000 : 16000` to maintain mobile render perf.
- The ghost-flag layer can keep a lighter throttle (project every 2nd frame on mobile) since ghosts are decorative; this preserves perf budget for the live markers.

Sanity check: the projection already uses the canonical cobe convention — `lon = lonRad - currentPhi - Math.PI/2`, theta rotation `(cosT, sinT)`, with `r = radius * 0.9`. That math is correct; the visible "drift" was the throttle, not the formula.

### 3. `src/components/landing/FeatureHighlightReel.tsx` — +20% on md/lg

Change the globe container's max-width breakpoints:

```tsx
// before
className="w-full max-w-[360px] md:max-w-[300px] lg:max-w-[320px] relative mx-auto"
// after
className="w-full max-w-[360px] md:max-w-[360px] lg:max-w-[384px] relative mx-auto"
```

Mobile (`max-w-[360px]`) is unchanged. `md:` goes 300→360 (+20%). `lg:` goes 320→384 (+20%).

---

## Files

- `src/components/ui/cobe-globe-pulse.tsx` — remove pinch + wheel zoom; remove mobile throttle on live flag projection.
- `src/components/landing/FeatureHighlightReel.tsx` — bump md/lg globe size by 20%.

No other files, no backend, no schema changes.

---

## Verification

- Mobile 390×844: two-finger pinch does nothing; one-finger drag still rotates; flags stay glued to their cities while the globe spins.
- iPad 820×1180: globe visibly ~20% larger than before; pinch does nothing.
- Desktop ≥1024: globe ~20% larger; mouse wheel scrolls the page (no longer hijacked); drag-to-rotate works; flags stay on their cities.
