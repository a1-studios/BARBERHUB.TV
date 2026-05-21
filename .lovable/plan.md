# Wire the home "map" to real map data

## What's wrong today

The honeycomb circle on `/` is **not a map**. It's `SphereHolographicWrapper` + `SphereImageGrid` — a rotating 3D ball of barber avatars over an SVG hex texture, rendered by `GlobalLeagueDashboard`. The search bar above it (`BarberSearchAutocomplete`) only searches barber names, with no geocoding and no pin output, which is why the user sees `No barbers found for "Town of North Hempstead"`.

The real engine already exists and is healthy:
- `BarberMapDirectory` (Mapbox GL, `light-v11`) with tiered pins, pulsing user marker, radius circle.
- `find_barbers_nearby_scored` RPC + `useMapVisibilityWeights` scoring.
- `BarberLocationSearch` (zip / GPS / city) that returns `{lat, lng, label}`.

It's currently only reachable behind the Map toggle inside `/barbers`.

## Goal

The home screen's "globe" area becomes the real interactive map, fed by live barber coordinates and driven by the same search bar at the top.

## Changes

### 1. `src/components/GlobalLeagueDashboard.tsx`
- Remove `SphereHolographicWrapper` + `SphereImageGrid` block (and the loading skeleton tied to it).
- Drop the standalone `BarberSearchAutocomplete` import/usage.
- Render `<BarberMapDirectory />` in the same vertical slot, wrapped so it visually sits in the same circular "hero" position (square container with rounded-2xl border, primary glow ring kept as a thin decorative frame so we don't lose the BARBER-HUB brand vibe — purely CSS, no sphere).
- Keep `LiveBattleFeed` underneath unchanged.

### 2. `src/components/map/BarberMapDirectory.tsx`
- Accept an optional `variant?: 'hero' | 'page'` prop.
  - `hero` (used on `/`): hide the internal `BarberLocationSearch` (the page already has one) and the top-right "X nearby" pill stays; height becomes responsive (`h-[60vh] min-h-[420px]`) instead of fixed 500 px so it fits the mobile viewport without empty scroll.
  - `page` (default, used in `/barbers` map toggle): unchanged behavior.
- Expose an imperative entry point via a new lightweight hook `useHomeMapLocation` (Zustand or simple module-level event emitter) so the page-level search bar can push `{lat, lng, label}` into the map without prop drilling.
- On mount in `hero` mode, auto-call `navigator.geolocation` once (with graceful fallback to a default center) so the map lands on the user's area with pins already visible — no empty hex feeling.

### 3. New `src/components/home/HomeBarberSearchBar.tsx`
- Replaces `BarberSearchAutocomplete` on the home screen.
- Composes `BarberLocationSearch` (real geocoder) + a name autocomplete dropdown side-by-side in a single pill:
  - Left icon: search.
  - Input: debounced; if it parses as a US zip or matches "City, ST" it routes through the location geocoder; otherwise it shows the name suggestions (reusing the existing autocomplete query from `BarberSearchAutocomplete`).
  - Right action: pin button → `navigator.geolocation` for "Near me".
- On location resolved → push `{lat, lng, label}` into `useHomeMapLocation`, which `BarberMapDirectory` subscribes to (triggers `searchNearby` and `flyTo`).
- On name picked → navigate to that barber's profile (current autocomplete behavior).

### 4. Keep `/barbers` untouched
- `BarbersDirectory` continues to mount `BarberMapDirectory` in `variant="page"` so nothing regresses there.

## Out of scope
- Sphere component itself is not deleted (other surfaces may still use it; we just stop using it on home).
- No DB / RPC / RLS changes — `find_barbers_nearby_scored` and `public_barber_profiles` already return what we need.
- No styling overhaul of `/barbers`.

## Files touched
- `src/components/GlobalLeagueDashboard.tsx` (edit)
- `src/components/map/BarberMapDirectory.tsx` (add `variant` + subscribe to home location store)
- `src/components/home/HomeBarberSearchBar.tsx` (new)
- `src/hooks/useHomeMapLocation.ts` (new, small store)

## Acceptance
- Loading `/` on mobile shows a real Mapbox map (not the hex sphere) in the hero slot, with the user's region centered and barber pins drawn from `find_barbers_nearby_scored`.
- Typing "Town of North Hempstead" in the home search bar geocodes and drops a radius circle + pins on the home map. No more "No barbers found" dead-end.
- `/barbers` map view still works exactly as it does today.
