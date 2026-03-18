

## Restructure Booking Flow + Add Barber Availability & Services Management

### Problem
1. The booking flow order isn't intuitive — service is picked before date/time. User wants: **Date → Service (dropdown) → Time (30-min slots with 3 quick picks: morning/afternoon/evening)**.
2. Quick picks show 4 slots; user wants exactly 3 spread across morning, afternoon, evening.
3. Barbers have no UI to manage their **services** (add/edit/delete haircut types, prices, durations) or **weekly availability** (set hours per day of week). The Business tab only has a freeform text "Business Hours" field and a slot duration selector — no structured CRUD.

### Changes

#### 1. Reorder `BookingConsole.tsx` — Date → Service → Time
Restructure the booking flow to this order:
- Style Capture (camera/mic) stays at top as hero
- **Date picker** (existing dropdown, moves up)
- **Service selector** (existing dropdown, moves below date)
- **Time slot picker** (quick picks + collapsible grid, moves to bottom)
- SOS / House Call buttons remain visible at bottom
- Notes link stays collapsed

This just reorders the existing components — no new components needed.

#### 2. Update `DateSlotPicker.tsx` — 3 Quick Picks (Morning/Afternoon/Evening)
- Change `getQuickPicks` to return exactly **3** slots: one from morning (before 12), one from afternoon (12-17), one from evening (17+). If a bucket is empty, skip it (so could be 1-3 picks).
- Label each quick pick with its period: "Morning 9:30 AM", "Afternoon 2:00 PM", "Evening 6:30 PM".
- Make them slightly larger cards for easy tapping.
- Keep the "Show all slots" collapsible below.

#### 3. Add Services Manager to `BarberSettings.tsx` Business tab
Add a "My Services" section in the Business tab with:
- List of existing services (name, price BB, duration, toggles for SOS/house call)
- "Add Service" button that expands an inline form: service name, price (BB), duration (minutes), deposit amount, allows SOS, allows house call, is free intro
- Edit/delete buttons on each service row
- CRUD operations hit `barber_services` table directly (barber already has RLS for own rows)

#### 4. Add Weekly Availability Manager to `BarberSettings.tsx` Business tab
Replace the freeform "Business Hours" textarea with a structured weekly schedule:
- 7 rows (Mon-Sun), each with: toggle (available/not), start time, end time
- Uses the existing `barber_availability` table
- On save, upsert rows for each day (insert if new, update if exists)
- Slot duration selector stays as-is (already works)

### Files Changed

| File | Change |
|------|--------|
| `src/components/booking/BookingConsole.tsx` | Reorder: Date → Service → Time |
| `src/components/booking/DateSlotPicker.tsx` | 3 quick picks labeled Morning/Afternoon/Evening |
| `src/components/profiles/BarberSettings.tsx` | Add Services CRUD + Weekly Availability schedule manager in Business tab |

No database changes needed — `barber_services` and `barber_availability` tables already exist with proper RLS.

