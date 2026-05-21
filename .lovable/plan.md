
# Barber Directory v2 — Distance-First Discovery

Reorganize `/barbers` around the question "who's near me, ranked by tier/score?" and make sure every barber has a usable address so distance is real.

## 1. Address capture for barbers

Goal: every barber profile carries a geocoded address so distance-to-fan can be computed.

- Add an **Address** block to the barber profile editor (in `BarberProfileForm` / settings):
  - Street, City, State, Postal Code, Country (country stays locked post-signup).
  - On save, call Google Maps Geocoding via the existing connector gateway in a small edge function `geocode-barber-address` → writes `latitude`, `longitude`, `shop_address`, `shop_city`, `shop_state` to `barber_profiles`.
  - Toggle: "Show exact address" vs "Show approximate area only" (default approx — store exact lat/lng, render rounded to ~0.5mi for privacy on public profile).
- Onboarding nudge: if a barber has no lat/lng, show a yellow banner on their own profile + Creator Hub: "Add your address so fans can find you."
- Backfill: existing barbers with `location` text but no lat/lng → one-time admin job to geocode.

## 2. New page layout (top → bottom)

```text
┌──────────────────────────────────────────────┐
│  BARBER-HUB header (existing)                │
├──────────────────────────────────────────────┤
│  ← Back                                       │
│  Barber Directory  ·  [List | Map] toggle    │
├──────────────────────────────────────────────┤
│  🔍  Search barbers, specialties...          │  ← Sticky search bar
├──────────────────────────────────────────────┤
│  [✂️ Fades][💈 Classic][🧔 Beard][🎨 Color]…│  ← Horizontal scrolling specialty pills
├──────────────────────────────────────────────┤
│  📍 Near: My Location  ·  Radius: [25 mi ▾] │  ← Location chip + radius toggle
│      5 · 10 · 25 · 50 · 100 mi               │
├──────────────────────────────────────────────┤
│  ⭐ Top Barbers Nearby (ranked)              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │  ← Horizontal rail, ranked by
│  │ #1  │ │ #2  │ │ #3  │ │ #4  │  →         │     visibility score (tier + BB +
│  └─────┘ └─────┘ └─────┘ └─────┘            │     battles + contribution)
├──────────────────────────────────────────────┤
│  All barbers in 25 mi  ·  Sort ▾ · Filters ▾│
│  [BarberProfileCard grid]                    │
└──────────────────────────────────────────────┘
```

Key behavior:
- **Search bar moves to top** (above pills), sticky on scroll.
- **Specialty pills** become the primary quick-filter — single-tap toggles `specialtyFilter`. Horizontal scroll, snap, no wrap.
- **Radius toggle** replaces hardcoded 15 mi: chips for 5 / 10 / 25 / 50 / 100 mi. Default 25 mi. Persists in localStorage.
- **Top Barbers Nearby rail** = first 8 barbers from the nearby RPC, sorted by `calculateVisibilityScore` (already in `src/lib/visibilityScore.ts`). Replaces the current generic `QuickBookBanner` "Top Barbers — Book Now" (which ignores distance).
- **Main grid** shows remaining barbers within radius, with existing sort + filters collapsed under the Filters button.
- Empty state when no barbers in radius: "No barbers within X mi — try expanding to 50 mi" with a one-tap upgrade.

## 3. Distance everywhere

- Each `BarberProfileCard` in distance mode shows a small `📍 3.2 mi` chip near the name (uses `distance_miles` from the RPC).
- `find_barbers_nearby` RPC: extend signature to accept `p_radius_miles` from the toggle (already supports it) and return at least the top 100 within radius.
- Default location source:
  1. Saved fan location (profile) →
  2. Browser geolocation prompt →
  3. Manual zip / city search (existing `BarberLocationSearch`).

## 4. Out of scope

- No changes to booking flow, BB economy, map view internals, or barber card design.
- No new ranking algorithm — reuse existing `visibilityScore`.

## Technical details

**Files touched**
- `src/pages/BarbersDirectory.tsx` — full layout reorder; new `RadiusToggle`, `TopBarbersNearbyRail` components.
- `src/components/barber/BarberProfileForm.tsx` (or equivalent settings form) — address fields + geocode call.
- `src/components/barber/BarberProfileCard.tsx` — accept optional `distanceMiles` prop, render chip.
- `src/components/map/BarberLocationSearch.tsx` — keep, but render inside the new location chip row.
- New: `src/components/barber/RadiusToggle.tsx`, `src/components/barber/TopBarbersNearbyRail.tsx`.
- New edge function: `supabase/functions/geocode-barber-address/index.ts` (uses Google Maps connector gateway).

**DB migration**
- Ensure `barber_profiles` has `latitude numeric`, `longitude numeric`, `shop_address text`, `shop_city text`, `shop_state text`, `shop_postal_code text`, `address_visibility text default 'approximate'`. Add only missing columns.
- Index: `CREATE INDEX IF NOT EXISTS idx_barber_profiles_geo ON barber_profiles (latitude, longitude) WHERE latitude IS NOT NULL;`
- RPC `find_barbers_nearby` — confirm it orders by Haversine distance and accepts `p_radius_miles` up to 100.

**State / persistence**
- `radiusMiles` in localStorage key `barbers:radiusMiles` (default 25).
- `lastLocation` cached in localStorage for instant render on return.

**Verification**
- Manual: load `/barbers` on mobile viewport → search at top, pills scroll horizontally, radius toggle changes results, Top Nearby rail re-sorts, each card shows mileage.
- Barber-side: edit profile → enter address → reload directory as a fan in same city → that barber appears with correct distance.
