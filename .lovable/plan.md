
## Globe visual + marker overhaul

Scope: `src/components/ui/cobe-globe-pulse.tsx` only. No data/logic changes.

### 1. Recolor palette
- `glowColor` → signature neon orange `[1, 0.45, 0.1]` (atmospheric rim halo around the sphere).
- `baseColor` → muted, deeper cyan-blue water (not neon): `[0.06, 0.22, 0.32]`.
- `markerColor` (cobe dots under flag pins) → orange `[1, 0.45, 0.1]` (kept).
- Lower `mapBrightness` slightly (≈4) so water reads as deep, not glowing.

### 2. Live marker icon: tiny barber razor (not pin dot)
- Replace the small orange pulse dot under each live flag with an inline SVG razor (straight-razor silhouette), ~10–12px, orange fill, soft orange drop-shadow for the "glow on rim" feel.
- Keep the flag emoji above the razor; keep tap-to-focus behavior intact.

### 3. Ghost flag layer (decorative, ~50% of globe)
- Add a curated list of ~40 country codes (the ones the user listed: CG, CO, CU, CW, CY, DK, DJ, DM, DO, EC, EG, GQ, SV, plus a balanced spread across continents) with approximate capital lat/lon.
- Render them through the same projection loop as live markers but in a separate `ghostRefs` array:
  - 55% opacity cap, smaller scale (≈0.6), no razor underneath, `pointerEvents: none`.
  - Hidden when on the back hemisphere (`z <= 0.05`) — natural ~50% visibility.
  - Not passed into cobe's `markers` array (no extra orange dots, no perf cost on the GPU side).
- Live markers (from `useLiveBarberMarkers`) always render on top of ghosts; de-dupe by country so a live barber's country replaces the ghost in that spot.

### 4. Performance
- Ghost projection runs in the same RAF loop, throttled on mobile (`frame % 2 === 0`, same as live markers).
- No new dependencies. No DB changes. No edge functions.

### Out of scope
- Drag/pinch interaction (still auto-rotate + tap-to-focus).
- Replacing cobe with three-globe / textured earth.
- Changes to `useLiveBarberMarkers` or any other file.
