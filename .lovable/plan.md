# Live Cyan Globe — Velvet Rope Landing

Upgrade `src/components/ui/cobe-globe-pulse.tsx` (used inside `FeatureHighlightReel` on `VelvetRopeLanding`) from a static decorative globe into a brand-tinted, data-driven, lightly interactive globe — without re-introducing the mobile drag lag we just fixed.

## 1. Cyan-tinted cobe palette

In the existing `createGlobe(...)` call, override the color stops only — geometry, map sample density, mobile DPR scaling, and the auto-rotation loop stay identical:

- `baseColor` → cyan-leaning slate (approx `[0.05, 0.18, 0.28]`) so the procedural dot map reads as ocean.
- `glowColor` → soft Zion-blue atmosphere (approx `[0.12, 0.55, 0.75]`).
- `markerColor` → keep neon orange (`[1, 0.45, 0.1]`).
- `dark: 1`, `diffuse` slightly lowered to let the cyan glow show.
- Overlay flag pins (orange dot + flag emoji) remain unchanged so brand orange still pops over the cyan field.

Note: cobe renders its land/water as a single procedural dot field, so this is the "tint base+glow cyan, markers orange" approach you picked — no texture swap, no bundle weight added.

## 2. Live data wiring (60s refresh)

New hook `src/hooks/useLiveBarberMarkers.tsx`:

- Query `barber_profiles` for rows where `location_sharing_enabled = true` AND `latitude IS NOT NULL` AND `longitude IS NOT NULL`.
- Select only public-safe fields: `id, latitude, longitude, shop_city`, plus a join to `public_user_profiles` (the safe view) for `country_code` so we can show the flag emoji.
- Cap at ~60 markers (cobe perf ceiling) — random sample if over.
- Refetch every 60s via `setInterval`; pause when `document.hidden`.
- Returns `PulseMarker[]` shaped exactly like the current `defaultMarkers`, so `GlobePulse` consumes it with no signature change.

`VelvetRopeLanding` passes the live markers in; falls back to the existing curated demo markers when the query is empty or still loading, so the hero never renders an empty globe.

## 3. Interactivity — tap-to-focus only

Per your decision, we do NOT re-enable drag or pinch (those caused the mobile lag). Instead:

- Keep `pointerEvents: "none"` on the `<canvas>` (auto-rotate stays smooth).
- Set `pointerEvents: "auto"` on the marker overlay `<div>`s only.
- Tapping a marker animates `phiOffsetRef` / `thetaOffsetRef` toward that marker's `[lat, lon]` over ~800ms using `requestAnimationFrame` easing, then resumes auto-rotation from the new position.
- Show a small floating chip with `shop_city, country` for ~2s after tap.

This gives the "real-time interactive" feel without the heavy continuous gesture work that was lagging mobile.

## 4. Performance guardrails (preserve what we just fixed)

- Keep the existing mobile branch: `mapSamples: 6000`, `devicePixelRatio` capped at 1.5, `renderScale: 1`.
- IntersectionObserver: pause the RAF loop when the globe is scrolled out of view.
- Throttle the marker projection loop to every other frame on mobile.
- No new heavy deps; no three.js, no texture loads.

## 5. Files touched

- `src/components/ui/cobe-globe-pulse.tsx` — recolor, add tap-to-focus, accept dynamic markers, IO pause, no drag.
- `src/hooks/useLiveBarberMarkers.tsx` — new; Supabase query + 60s polling.
- `src/components/landing/FeatureHighlightReel.tsx` — pass live markers into `<GlobePulse markers={...} />` (fallback to demo).
- No DB migration, no edge function, no schema change — `barber_profiles.location_sharing_enabled`, `latitude`, `longitude`, `shop_city` already exist and are readable via the public view pattern already used elsewhere.

## Out of scope

- True cyan-water / orange-land textured earth (would require swapping cobe for three-globe).
- Drag / pinch-zoom gestures (explicitly declined to protect mobile perf).
- Realtime subscriptions (60s polling chosen instead).
- Clustering — capped sample of 60 markers is enough for a landing hero.
