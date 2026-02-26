

## Fix BookingConsole Layout — Vertical Toggles & Scrollable Dates

### Changes

#### `src/components/booking/BookingConsole.tsx`
- Change tri-state toggle from `grid grid-cols-3` to `flex flex-col gap-1` — stack Standard, SOS, House Call vertically as full-width buttons
- Keep buttons compact at `h-8`

#### `src/components/booking/DateSlotPicker.tsx`  
- The date row already uses `ScrollArea` with horizontal scroll — the issue is the date buttons are too wide and there's no visual scroll affordance
- Reduce date button width from `w-11` to `w-10`
- Remove the month label row to make buttons even more compact (just show day abbreviation + date number)
- Ensure the `ScrollArea` container has a fixed max-width so overflow scrolls properly

