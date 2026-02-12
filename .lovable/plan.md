

## Maximize Screen Real Estate on Profile Page (and App-Wide Mobile Optimization)

### Problem

The Profile page (screenshot) shows significant wasted space on mobile:
1. Large top padding (`pt-20 sm:pt-24`) creates a gap between the header and content
2. The "Back" button takes a full row of vertical space
3. The container is constrained to `max-w-4xl` with `px-4` horizontal padding, leaving margins on wider phones
4. The `BarberProfileHeader` card has `p-6 md:p-8` internal padding, wasting space on small screens
5. The card has `mb-6` margin below, adding more gaps
6. Content sections have `space-y-4 sm:space-y-6` which adds up

### Changes

#### File: `src/pages/Profile.tsx`

- Reduce top padding from `pt-20 sm:pt-24` to `pt-16 sm:pt-20` (tighter to header)
- Reduce horizontal padding from `px-4` to `px-2 sm:px-4`
- Remove the `BackButton` component entirely -- profile is a primary destination accessed from the header coin, not a drilled-down sub-page; the browser/app back gesture handles navigation
- Reduce the `mb-6` gap below the BarberProfileHeader to `mb-3`
- Reduce `space-y-4 sm:space-y-6` to `space-y-3 sm:space-y-6` for tighter mobile stacking
- Remove `max-w-4xl` constraint on mobile (use `max-w-none sm:max-w-4xl`) so the profile card stretches edge-to-edge

#### File: `src/components/barber/BarberProfileHeader.tsx`

- Reduce mobile padding from `p-6` to `p-4` on the CardContent
- Reduce the avatar size on mobile from `w-24 h-24` to `w-20 h-20` to reclaim vertical space
- Tighten the `gap-6` between avatar and info to `gap-4` on mobile
- Reduce `space-y-4` between internal sections to `space-y-3`
- Make stat numbers slightly smaller on mobile (`text-lg` instead of `text-xl`)
- Compact the action buttons row: reduce `pt-2` to `pt-1`

#### App-Wide: Consistent Mobile-First Spacing

Apply the same tighter spacing philosophy to the loading and setup states in Profile.tsx:
- Setup/completion prompts: reduce `pt-24` to `pt-16` on mobile
- Use `px-2 sm:px-4` consistently

### Summary

| File | Change | Impact |
|------|--------|--------|
| `src/pages/Profile.tsx` | Remove BackButton, tighten padding/margins, full-width on mobile | ~80px vertical space recovered |
| `src/components/barber/BarberProfileHeader.tsx` | Reduce internal padding, avatar size, gaps on mobile | ~40px vertical space recovered |

### What Is NOT Changing

- Header component -- stays fixed
- BarberProfileHeader functionality (BB display, social links, stats, action buttons) -- all preserved
- TransactionHistory placement -- stays below profile card
- AddFundsModal -- untouched
- Desktop layout -- all changes are mobile-only via responsive breakpoints

