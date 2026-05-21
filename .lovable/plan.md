## Goal

On the Barbers Directory map view: (1) promote **Top Matches Near You** above the Mapbox map, (2) give every nearby card the same fixed size, and (3) bring back the old floating-profile **sphere** as a hero element fed by the same nearby-barbers query that powers the map.

## Changes

### 1. `src/components/map/BarberMapDirectory.tsx` — reorder + sphere + uniform cards

- **Move the "Top Matches Near You" rail** (currently lines ~317-344, rendered *after* the map block) so it renders *before* the map container. Keep its data source (`scoredBarbers`) unchanged — it already comes from the live RPC `find_barbers_nearby`.
- **Drop the `.reverse()`** so order matches visibility ranking (best first).
- **Stop the horizontal snap rail on desktop** and switch the card row to a uniform layout:
  - Mobile (<sm): horizontal snap scroll, every card the **same fixed width** (`w-[260px]` instead of `w-[78vw] max-w-[240px]`).
  - ≥sm: 2-up grid; ≥lg: 3-up grid. All cards equal height (`h-full` + `grid` parent).
- **Insert the sphere block above the rail** when `scoredBarbers.length >= 4` (fall back to rail-only otherwise). The sphere is the visual "hero" of the section; the rail sits directly under it as a tap-friendly list.

### 2. `src/components/map/NearbyBarberCard.tsx` — fixed dimensions

- Replace `w-[78vw] max-w-[240px]` with `w-full` and let the parent control width.
- Add `h-full flex flex-col` so cards in a grid stretch to equal height; push the `View Profile` button to the bottom with `mt-auto`.

### 3. New file `src/components/map/NearbySphere.tsx` — wraps `SphereImageGrid`

- Accepts `barbers: ScoredBarber[]` (the same shape already built in `BarberMapDirectory`).
- Maps each barber to the `ImageData` shape expected by `SphereImageGrid`:
  ```ts
  { id, src: avatar_url ?? fallback, alt: name, title: name,
    description: specialty ?? location, rank: index+1,
    isChampion: index === 0, location, rating: score }
  ```
- Renders `<SphereHolographicWrapper><SphereImageGrid images={...} autoRotate showChampionCrown /></SphereHolographicWrapper>` with a responsive `containerSize` (≈320 on mobile, 480 on desktop).
- Clicking an avatar navigates to `/barber/:user_id` (wire through `SphereImageGrid`'s existing `selectedImage` state via a small `onSelect` prop — add the prop if missing, otherwise use the existing modal then a "View Profile" link).
- Empty/loading states: skeleton sphere placeholder while `loading` is true.

### 4. `src/pages/BarbersDirectory.tsx` — no structural change required

- The page-level `TopBarbersNearbyRail` (used only in list view) stays as-is.
- All work above happens inside `BarberMapDirectory`, which is already mounted by the page when `viewMode === 'map'`.

## Section order after the change (map view)

```
[ Location search + radius chips ]
[ 🌐 NearbySphere — floating avatars of top nearby barbers ]
[ Top Matches Near You — uniform card grid/rail ]
[ Mapbox map with pins ]
[ Empty state (if no barbers in radius) ]
```

## Out of scope

- No DB / RPC / Edge Function changes — the sphere reuses the existing `find_barbers_nearby` results.
- No changes to list view, header, or other pages.
- No new sphere physics — reuse `SphereImageGrid` + `SphereHolographicWrapper` as-is.
