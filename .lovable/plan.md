

## Fix BookingConsole Layout — Compact & Contained

### Problems from screenshot
1. Dialog content overflows right edge — the SOS and House Call toggle buttons are cut off
2. Date buttons are too large (h-16 w-14), taking excessive vertical space
3. Too much vertical spacing between sections
4. Overall too verbose — needs tighter, more minimalist feel

### Changes

#### `src/components/booking/BookingConsole.tsx`
- Remove icon from tri-state toggle buttons — text-only for cleaner look
- Reduce toggle icon sizes from `h-4 w-4` to `h-3 w-3`
- Reduce spacing: `space-y-4` → `space-y-3`, `pt-3` → `pt-2`
- Compact wallet row padding
- Reduce CTA button height from `h-12` → `h-10`
- Total text size from `text-xl` → `text-lg`

#### `src/components/booking/DateSlotPicker.tsx`
- Shrink date buttons from `h-16 w-14` → `h-12 w-11`
- Reduce font sizes: day label `text-[10px]` → `text-[9px]`, date number `text-lg` → `text-base`, month `text-[10px]` → `text-[9px]`
- Reduce gap between date buttons from `gap-2` → `gap-1.5`

#### `src/components/booking/BountyPresetPicker.tsx`
- Shrink preset buttons from `h-12` → `h-9`
- Use `text-xs` instead of `text-sm`
- Replace amber-500 hardcoded colors with theme tokens (accent)

#### `src/components/booking/ServiceSelector.tsx`
- No changes needed — already compact

