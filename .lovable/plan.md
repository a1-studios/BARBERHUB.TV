

# Enable Fan Location Search (Zip Code + Geolocation)

## Problem
The zip code and "Use My Location" search controls only appear in the **map view**. When fans land on `/barbers` they see the **list view** by default with no location-based search option. The search bar only filters by name/specialty text.

## Changes

### 1. Add location search bar to the list view — `BarbersDirectory.tsx`
- Add a zip code input + "Use My Location" button above the existing filters in list view
- When a fan enters a zip code or grants geolocation, geocode with Google Maps REST API, then filter the list to show only barbers within 15 miles using the `find_barbers_nearby` RPC
- Show a "Showing barbers near [location]" badge with a clear/reset button
- When location filter is active, sort by distance instead of tier by default

### 2. Auto-switch to map view on location search (optional UX boost)
- When a fan searches by zip or taps "Use My Location" from list view, auto-switch to map view to show the visual radius and pins
- Add a small prompt: "Switch to map view to see barbers near you"

### 3. Shared location search component — new `BarberLocationSearch.tsx`
- Extract the zip input + geolocation button into a reusable component used by both list and map views
- Props: `onLocationFound(lat, lng, label)`, `loading`
- Keeps the Google geocoding logic in one place

| File | Change |
|------|--------|
| `src/components/map/BarberLocationSearch.tsx` | New shared component: zip input + Use My Location button + Google geocoding |
| `src/pages/BarbersDirectory.tsx` | Add location search bar to list view header, call `find_barbers_nearby` when location is set, show distance-sorted results |
| `src/components/map/BarberMapDirectory.tsx` | Refactor to use the shared `BarberLocationSearch` component |

