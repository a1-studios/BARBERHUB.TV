# Quick Location Toggle + Fix Barbers-Near-Me + Branded Result Cards

## Root cause of "no barbers found"

Database check shows **0 of 8 barber profiles** have `location_sharing_enabled = true` and **0** have `latitude/longitude` saved. So the RPC is correct — there's literally nothing to return. Two real problems are causing this:

1. **The toggle is buried** inside `BarberSettings → Booking Economy section`. Most barbers never reach it.
2. **Geolocation silently fails in the Lovable preview iframe** because the iframe is not loaded with `allow="geolocation"`. The browser denies the permission, the `onError` shows a toast, but barbers think they "turned it on" because the switch UI flips optimistically. Today the switch in `BarberSettings.tsx` does not revert when GPS denies.

## What we'll build

### 1. Quick Location Toggle on the barber's own profile (Creator Hub / Profile header)

Add a compact `LocationQuickToggle` pill that lives next to the Settings button in `BarberProfileHeader` (only visible when `showActions=true` — i.e. own profile). One tap:

- **Off → On**: requests GPS, on success writes `{latitude, longitude, location_sharing_enabled: true}` to `barber_profiles`. If denied/iframe-blocked, shows clear toast "Open in full window to share location" with a deeplink to the published URL, and **reverts the switch**.
- **On → Off**: flips `location_sharing_enabled = false` (keeps coords).
- **Manual fallback**: small "Set by zip" link opens a tiny popover using the existing Google Geocoding flow (same code path as `BarberLocationSearch`) so barbers behind permission-blocked iframes can still pin themselves.

Status dot: green pulse "Live on map" / grey "Hidden".

Also keep the existing Settings toggle, but mirror the same revert-on-error fix.

### 2. Fix the search reliability gap

- `BarberSettings.tsx` + new `LocationQuickToggle`: on geolocation error or any update error, **revert the Switch state** so the UI never lies.
- `BarberMapDirectory.tsx`: when 0 results, replace the generic toast with an inline empty-state card explaining the radius is 15 mi and offering to widen.
- Add a console-visible warning + dev-only banner if `import.meta.env.VITE_MAPBOX_TOKEN` or `VITE_GOOGLE_MAPS_API_KEY` are missing.
- Add a `MapPin` deeplink from the empty-state card straight to the barber's own toggle (for self-testing flow).

No DB / RPC / schema changes needed — current `find_barbers_nearby_scored` works correctly; the data just isn't there yet.

### 3. Branded nearby-barber result card

Today nearby barbers are shown only as Mapbox pins with a tiny HTML popup. We'll add a **scrollable horizontal card rail under the map** rendering each scored barber as a premium card:

- Avatar with TierRing (reuse `<TierRing>`)
- Neon Orange (`hsl(25 95% 53%)`) accent border + Zion Blue (`hsl(187 80% 60%)`) distance pill
- Name + country flag (reuse the `BarberProfileHeader` flag helper)
- Specialty (truncated)
- Distance (`X.X mi away`) with pulsing dot
- M4M heartbeat badge if certified
- Subscription tier chip (silver/gold/diamond glow matching `getTierStyle`)
- "View Profile" CTA → `/barber/:user_id`
- Card hover scales the matching map pin (shared scoring scale)

Built as a new component `src/components/map/NearbyBarberCard.tsx`, used by `BarberMapDirectory.tsx` below the map.

## Files

- **New** `src/components/profiles/LocationQuickToggle.tsx`
- **New** `src/components/map/NearbyBarberCard.tsx`
- **Edit** `src/components/barber/BarberProfileHeader.tsx` — mount `LocationQuickToggle` when `showActions && isBarber`
- **Edit** `src/components/profiles/BarberSettings.tsx` — revert switch on error
- **Edit** `src/components/map/BarberMapDirectory.tsx` — render `NearbyBarberCard` rail + empty-state card + token warnings

No DB migration. No backend changes.

## Verification

1. Toggle in profile → grant GPS → row in `barber_profiles` has `location_sharing_enabled=true` and coords (verify via SQL).
2. Visit `/barbers`, "Use My Location" → barber appears as pin **and** as branded card.
3. Deny GPS in iframe → switch flips back, toast suggests opening in new window.
4. Empty state shows when no nearby matches with helpful messaging.

## Tokens / API keys needed from you

Everything required is already in place:
- `VITE_MAPBOX_TOKEN` — already set
- `VITE_GOOGLE_MAPS_API_KEY` — already used by `BarberLocationSearch`

**Nothing new needed from you.** If your `VITE_GOOGLE_MAPS_API_KEY` is missing or restricted, the zip-code fallback won't geocode — let me know and I'll add a check. Otherwise approve and I'll build.