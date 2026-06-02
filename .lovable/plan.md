
## Marker + flag geo-anchoring + ghost tuning

Scope: `src/components/ui/cobe-globe-pulse.tsx` only.

### 1. Swap razor → clippers icon
- Replace the `Razor` inline SVG with a `Clippers` SVG: rectangular body + comb-teeth detail at the head, ~12px, orange fill (`hsl(28 100% 55%)`), 1px hotter-orange outline, soft orange drop-shadow for the rim-light feel.
- Crisper geometry (no rotated rectangles overlapping); reads as a clipper silhouette at 12px.

### 2. Anchor flag center on the exact geo coordinate
- Current overlay markup is `flex-col`: flag on top, razor below — so the projected (px,py) lands between them, offsetting the flag north.
- New stack: the projected point translates `(-50%, -50%)` over the **flag emoji** specifically. Clippers sit absolutely positioned just below the flag, not part of the centering box.
- Net effect: flag emoji's geometric center sits exactly on the country's lat/lon; the clipper hangs ~10px south as a decorative tag.

### 3. Tune ghost markers (target ~70 capitals, fuller globe)
- Expand `GHOST_FLAGS` list from ~40 to ~70 capitals spread across all continents (add more from Africa, Asia, Eastern Europe, Oceania, Caribbean, Central Asia). Keep the user's required set (CG, CO, CU, CW, CY, DK, DJ, DM, DO, EC, EG, GQ, SV).
- Slight visual dial-back so 70 doesn't crowd the live markers:
  - Font size 12px (down from 14px)
  - Max opacity 0.45 (down from 0.55)
  - Scale `0.5 + z*0.22`
  - No drop-shadow on ghost flags (lighter weight)
- Ghosts also anchor flag center on coord (same fix as #2).

### 4. Perf hygiene
- Memoize the mapped `ghostLocations` array (currently re-created every RAF frame) using `useMemo` so the loop reuses one array.
- Everything else (auto-rotate, tap-to-focus, IntersectionObserver pause, mobile throttling, palette) stays as-is.

### Out of scope
- Live-marker data source, palette, drag/pinch, edge functions, DB.
