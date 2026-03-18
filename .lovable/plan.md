

## Quick Time Picks + 30-Minute Slot Breakdown

### Problem
When a user picks a date, they see either all slots in a flat grid or "No available slots." There's no quick-pick UX to surface the best times, and barbers don't have a setting to configure their slot duration (it defaults to 30 min from the DB but isn't exposed in settings).

### Changes

#### 1. Update `DateSlotPicker.tsx` -- Add "Quick Picks" row
After a date is selected, show a highlighted row of up to 4 recommended time slots before the full grid:
- Pick the first 4 available slots spread across the day (morning, midday, afternoon, evening buckets if available; otherwise just the first 4)
- Render them as larger, accent-styled buttons labeled "Quick Pick" above the full grid
- Full slot grid remains below as "All Available Times" for manual selection
- Both quick picks and grid slots call the same `onSelectSlot`

#### 2. Update `DateSlotPicker.tsx` -- Visual polish
- Quick picks section: 4 buttons in a single row with `bg-cyan-500/10 border-cyan-500/40` styling, slightly larger than grid slots
- "All Times" grid stays as-is but gets a collapsible toggle ("Show all X slots") so the UI stays compact

#### 3. Add slot duration setting to `BarberSettings.tsx` Business tab
In the existing "Booking Economy" card, add a "Time Slot Duration" selector:
- Options: 15 min, 30 min (default), 45 min, 60 min
- Maps to `barber_availability.slot_duration_minutes` -- update all rows for this barber when saved
- This controls how `useBarberAvailability` generates slots (already reads `slot_duration_minutes`)

### Files Changed

| File | Change |
|------|--------|
| `src/components/booking/DateSlotPicker.tsx` | Add quick-pick row (first 4 spread slots), collapsible full grid |
| `src/components/profiles/BarberSettings.tsx` | Add slot duration selector in Business tab |

