

# Persistent Location Toggle + Visual Map Indicators

## Overview
Two changes: (1) Make the barber's "Share My Location" toggle persistent and always-on by default once enabled — it stays active across sessions without requiring re-capture each time. (2) Add clear visual indicators on the map showing barber pins with pulsing animations and a 15-mile radius circle around the user's search point.

---

## 1. Persistent Location Toggle — `BarberSettings.tsx`

**Current problem**: The toggle reads from the database but re-requests GPS every time it's turned on. Once enabled, it should stay on indefinitely without re-prompting.

**Changes**:
- Only request GPS coordinates the **first time** the toggle is turned ON (when lat/lng are null in the DB)
- If lat/lng already exist in the database, just flip `location_sharing_enabled = true` without re-prompting for GPS
- Add a "Refresh Location" button that appears only when location sharing is already ON, allowing the barber to update their coordinates manually
- Add a visual indicator below the toggle showing current status: green dot + "Live on map" when ON, gray dot + "Hidden" when OFF
- Show the barber's saved coordinates as a subtle text hint (e.g., "Location saved ✓") so they know it persists

---

## 2. Map Visual Indicators — `BarberMapDirectory.tsx`

**Add a 15-mile radius circle**:
- After a search or geolocation, draw a translucent orange circle on the map centered on the user's coordinates with a 15-mile radius
- Use MapLibre's `addSource`/`addLayer` with a GeoJSON circle polygon (computed from the center point)
- Style: orange fill at 8% opacity, orange stroke at 40% opacity

**Enhance barber pin markers**:
- Add a CSS pulsing animation to the orange dot markers so they visually "breathe"
- Add a small scissors icon or initials inside each pin for better identification
- Differentiate tier levels visually: Diamond = cyan glow, Gold = yellow glow, Silver = white glow, Bronze/Free = default orange

**Add a user location marker**:
- When the user searches or uses geolocation, place a distinct blue pulsing dot at their position so they can see where they are relative to barbers

**Add a barber count badge overlay on the map**:
- Small floating badge in the top-left corner of the map showing "X barbers nearby"

---

## 3. Inject CSS Animation — `src/index.css`

Add a `@keyframes pulse-pin` animation for the map markers:
```css
@keyframes pulse-pin {
  0%, 100% { box-shadow: 0 0 8px hsla(25,95%,53%,0.5); }
  50% { box-shadow: 0 0 16px hsla(25,95%,53%,0.8); }
}
```

---

## File Summary

| File | Change |
|------|--------|
| `src/components/profiles/BarberSettings.tsx` | Make toggle persistent — skip GPS re-prompt if coords exist, add refresh button, add green/gray status dot |
| `src/components/map/BarberMapDirectory.tsx` | Add 15-mile radius circle, user location blue dot, pulsing pin animation, tier-based glow colors, barber count badge |
| `src/index.css` | Add `pulse-pin` keyframe animation |

