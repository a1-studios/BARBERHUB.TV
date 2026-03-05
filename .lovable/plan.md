

## Display BB Equivalent in PortalGlobeHero

### What
Add a dynamic Barber Bucks (BB) equivalent display below the USD prize pool in the globe hero, using the live `useCategoryPrizePools` hook. The conversion rate is $1 = 5 BB, so the base $25,000 = 125,000 BB. As donations increase the pool, the BB number updates accordingly.

### Changes to `src/components/portal/PortalGlobeHero.tsx`

1. Import `useCategoryPrizePools` hook
2. Pull `totalPrizePool` (in cents) from the hook
3. Convert to BB: `(totalPrizePool / 100) * 5`
4. Display between the title and LiveMatchCounter as two lines:
   - USD amount: formatted with `Intl.NumberFormat` (e.g. "$25,000")
   - BB equivalent below it: "≈ 125,000 BB" in a smaller orange/cyan gradient text
5. Update the ticker's first item to use the live USD value instead of hardcoded "$25,000+"
6. Both values animate on change using framer-motion `key` transitions

### Files Modified
| File | Change |
|------|--------|
| `src/components/portal/PortalGlobeHero.tsx` | Add hook, display live USD + BB equivalent |

