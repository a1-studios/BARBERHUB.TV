

## Fix Date Picker — Use Select Dropdown Instead of Button Row

The 14 date buttons in a horizontal row keep overflowing the dialog. Instead of trying to squeeze them in, replace the date row with a **native Select dropdown** showing all 14 days. This guarantees zero overflow.

### Changes

#### `src/components/booking/DateSlotPicker.tsx`
- Replace the horizontal button row with a `Select` dropdown (from shadcn/ui)
- Each option shows "Thu, Feb 26" format — clear and compact
- Today's date is pre-selected
- Remove the `overflow-x-auto` scroll container entirely
- Keep the time slots grid as-is (already fits with `grid-cols-3`)
- Reduce time slot grid `max-h-48` to `max-h-36` for tighter fit

This completely eliminates the overflow issue — a dropdown takes one line of space regardless of how many dates exist.

