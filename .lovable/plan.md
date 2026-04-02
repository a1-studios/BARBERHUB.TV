

# Move "Official Gear" Label Below Grid & Remove Top Spacing

## Changes — Single file: `src/components/ProductShelf.tsx`

1. **Remove top padding** — change `py-2` to `pt-0 pb-1` so the gear grid sits flush against the video above
2. **Move the "Official Gear" label below the grid** — relocate the header `div` (ShoppingBag icon + h3) from above the grid to below it, centered
3. **Center the label** — change from `flex items-center gap-1.5 mb-1.5` to `flex items-center justify-center gap-1.5 mt-1`
4. **Tighten grid gap** — reduce `gap-2` to `gap-1.5` to bring the three boxes closer together

Result: The three product tiles will be directly under the video with no spacing, and the "Official Gear" label will sit centered underneath them.

