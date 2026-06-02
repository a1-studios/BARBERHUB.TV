## Fix globe markers — geo anchoring + barber pole icon

Scope: `src/components/ui/cobe-globe-pulse.tsx` only.

### Problem analysis
1. **"Marker not working"** — Two reasons:
   - Cobe's built-in `markers` array still draws a hot orange dot at each live point. That dot doesn't move with our overlay math, so the user sees a stranded glow that looks broken next to the flag.
   - The overlay `<div>` is `absolute top-0 left-0` and gets `translate3d(px, py, 0) translate(-50%, -50%)`. That centers the **div bounding box**, but the inner flag emoji is taller than wide due to the clipper hanging beneath it via `top-full`. So the flag's visual center sits *above* the geo point. → flag drifts north.
2. **"Still looks like a clipper"** — the `Clippers` SVG renders as a generic rectangle blob at 12px. User wants it gone; replace with a tiny **barber pole** icon hanging under each live flag, and remove Cobe's bright marker entirely.

### Changes

**1. Kill the Cobe built-in marker layer**
- Pass `markers: []` to `createGlobe(...)`. Our overlay flags + barber poles are the only visible points.
- Keep `markerColor` / `glowColor` (used for the globe's rim glow).

**2. True geo-anchored flag (fix drift)**
- Wrap each live marker overlay in a zero-size positioning anchor:
  ```tsx
  <div className="absolute top-0 left-0 w-0 h-0">  {/* projected point */}
    <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
      <span className="text-[18px] leading-none">{flag}</span>
      <BarberPole />        {/* hangs 2px below flag */}
    </div>
  </div>
  ```
- `projectGroup` writes `translate3d(px, py, 0) scale(...)` onto the **outer** zero-size anchor only. The inner translate(-50%, -50%) keeps the flag emoji's geometric center exactly on (px, py); the pole stacks below as a tag and does NOT shift the anchor.
- Same fix for ghost flags (zero-size wrapper, inner `-translate-x-1/2 -translate-y-1/2`).

**3. Replace `Clippers` with `BarberPole`**
- New inline SVG: vertical capsule, red/white/blue diagonal stripes, gold caps top + bottom, ~14px tall × 5px wide, soft orange drop-shadow glow.
- Sits directly under the flag (`mt-[2px]`).

**4. Cleanup**
- Remove the now-unused `Clippers` component.
- No changes to ghosts list, rotation, focus-on-tap, or palette.

### Out of scope
- Live data source, palette/colors elsewhere, mobile throttling, focus animation.
