## Globe polish: glow -30%, drop pin, light up pole, true geo anchor

Scope: `src/components/ui/cobe-globe-pulse.tsx` + `src/hooks/useLiveBarberMarkers.tsx`.

### 1. Reduce globe edge glow by ~30%
Cobe's edge glow is driven by `glowColor` and `diffuse` in the `createGlobe` config.
- `glowColor: [1, 0.45, 0.1]` → `[0.7, 0.32, 0.07]` (30% darker orange ring).
- `diffuse: 1.1` → `0.8` (softer scatter halo).
- Leave `markerColor` alone (no built-in markers anyway).

### 2. Eliminate the pin (📍) — barber pole only when no flag
Right now `useLiveBarberMarkers` falls back to `flag: "📍"` when a DB barber has no `country_code`. That's the pin the user sees on the globe.
- Change fallback to `flag: undefined`.
- In `GlobePulse` live-marker render: if `m.flag` is missing, render **only** the barber pole at the geo point (no emoji, no pin).

### 3. Make the barber pole "light up"
Add a subtle animated glow + barbershop-stripe rotation cue:
- Wrap `<BarberPole/>` in a span with a pulsing orange halo: `before:` ring using a CSS keyframe `pole-pulse` (1.8s, opacity 0.35 → 0.85 → 0.35, scale 0.9 → 1.15 → 0.9).
- Add a faint orange `box-shadow` that breathes on the same keyframe.
- Keyframe defined inline in the component via a `<style>` tag (component-scoped, no global CSS change).

### 4. Fix flag/geo anchoring (the real cause of drift)
Current inner stack is `flex-col items-center` with `-translate-x-1/2 -translate-y-1/2`. That centers the **whole flag+pole column** on (px,py), which puts the flag visibly *above* the geo coord and the pole below.

Fix: anchor the **flag emoji's center** on the geo point, then let the pole hang absolutely beneath without affecting the anchor:
```tsx
<div className="absolute top-0 left-0 w-0 h-0 will-change-transform"> {/* projected (px,py) */}
  <span className="absolute -translate-x-1/2 -translate-y-1/2 block text-[18px] leading-none whitespace-nowrap">
    {m.flag}
  </span>
  <span className="absolute left-1/2 -translate-x-1/2 top-[8px] pointer-events-none">
    <BarberPole size={14} />  {/* sits just below the flag, doesn't shift the anchor */}
  </span>
  <button className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6" onClick={…} />  {/* invisible tap hit-area */}
</div>
```
When `m.flag` is missing, skip the emoji and put the pole's TOP at the geo point.

Same zero-size + inner -50% pattern for ghost flags is already correct.

### 5. Verify tap → chip + focus highlight
Read the current `focusMarker`: it sets `chip` (city/country) + animates phi/theta. To make the focused marker visibly stand out, on tap also flash a 1-frame orange ring around the tapped flag via a `focusedId` state. The flag wrapper gets a `ring-2 ring-orange-400/70 rounded-full` style when `m.id === focusedId`, cleared after 2.2s.

Then I'll verify in the browser:
- Tap a marker → chip appears bottom-center with city + country.
- Globe rotates to focus that marker.
- The tapped marker shows a pulsing ring for ~2s.

### Out of scope
Live-marker data source beyond removing the 📍 fallback, ghost list, palette, mobile throttling, focus animation curve.
