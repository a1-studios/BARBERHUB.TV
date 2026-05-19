## Barber Discovery Map — Refresh Plan

Scope: visual + UX overhaul of `BarberMapDirectory` and the surrounding "Find barbers near you" experience on `/barbers`. Frontend-only; no schema, RPC, or BB logic changes.

### 1. Map Style — Light theme with signature orange
- Switch `mapboxgl.Map` style from `mapbox/dark-v11` → `mapbox/light-v11` for the native deep-blue water tones with light land.
- Keep all overlays in our brand orange `hsl(25 95% 53%)`:
  - Radius circle fill (opacity ~0.10) and dashed stroke
  - Barber pins (✂ markers) — slightly darker border for contrast on the light base
  - User location pin stays Zion Blue for contrast
- Update popup card to a light surface (white background, dark text) so it reads correctly over the light tiles, while keeping the orange "View Profile" CTA.

### 2. Fix overlapping cards
Root cause: the result rail uses fixed-width children inside `overflow-x-auto` with `snap-mandatory`; on a 390px viewport the flex children collide with the map container and adjacent absolute badges.

Fix:
- Move the result rail below the map with a clear vertical gap and `min-w-0` wrapper.
- Switch `NearbyBarberCard` width from inline `w-[220px]` to `w-[78vw] max-w-[260px]` so cards never exceed viewport.
- Add `flex-nowrap`, proper `gap-3`, and `scroll-pl-4` for clean horizontal snapping.
- Lift the floating "X barbers nearby" pill to top-right so it doesn't overlap the Mapbox nav control or the cards.

### 3. Unified, collapsible filter container
Replace the scattered "Search / Tier / Country / Live / Sort / Specialty pills" stacks with one `<Collapsible>` "Filters" panel directly under the location bar:

```
[ 📍 Location bar — wired to map  ]   [ ⚙ Filters (3) ▾ ]
   ▼ (opens)
   ┌──────────────────────────────────────────┐
   │ Search input                              │
   │ Specialty pills (single row, scrollable)  │
   │ Tier ▾   Country ▾   Live ▾   Sort ▾      │
   │ [Reset]                          [Apply]  │
   └──────────────────────────────────────────┘
```

- Show an active-filter count badge on the trigger.
- Closed by default on mobile, open on `md+`.
- Reuses existing state in `BarbersDirectory.tsx` — no logic rewrite.

### 4. Wire "Find barbers near you" to the actual map with adjustable radius
Currently the map's `RADIUS_MILES` is a hard-coded `15`. Make it dynamic and shared.

- Add `radiusMiles` state inside `BarberMapDirectory` (default `15`), exposed via a compact radius selector overlaid on the map (top-left, below the count pill):

  ```
  Radius:  [ 1 ] [ 5 ] [ 15 ] [ 25 ] [ 50 ]  mi
  ```

  Pills styled in brand orange when active, muted otherwise.
- On change:
  - Re-call `find_barbers_nearby_scored` with new `p_radius_miles`
  - Redraw the radius circle via `drawRadiusCircle(lng, lat, radiusMiles)` (function gains a param)
  - `fitBounds` to the new circle
- Empty-state copy becomes dynamic: "No barbers within {radius} miles".
- The existing `BarberLocationSearch` already drives `handleLocationFound` — no API change needed; default behavior on mount: if `navigator.geolocation` permission is already granted, auto-center and search at 15 mi (silent fail otherwise so we don't prompt unexpectedly).

### 5. Files to touch (frontend only)
- `src/components/map/BarberMapDirectory.tsx` — light style, radius state + selector UI, dynamic radius circle, light popup theme, count-pill repositioned.
- `src/components/map/NearbyBarberCard.tsx` — responsive width, `min-w-0`, light/dark-safe contrast.
- `src/pages/BarbersDirectory.tsx` — wrap existing filters into a single `<Collapsible>` panel with active-count badge; tighten layout spacing.
- (Optional) add `src/components/map/RadiusSelector.tsx` as a small presentational component.

### Out of scope
- Database/RPC changes (radius already a parameter to `find_barbers_nearby_scored`).
- New filter dimensions beyond what `BarbersDirectory` already supports.
- Auth, payments, BB economy, moderation.

### Technical notes
- Mapbox light style still respects our `radius-circle-fill` and `radius-circle-stroke` paint props; no token swap needed.
- Marker contrast: bump border from `2.5px` to `3px` solid `hsl(25 95% 35%)` on light tiles.
- Popup background switches to `#ffffff` with `color:#0a0a0f`; CTA keeps `hsl(25 95% 53%)`.
- Radius circle redraw uses the existing `radius-circle` source via `setData()` — no source/layer churn.