## Make gear product images fill the card

Update `src/components/ProductShelf.tsx` so each gear tile uses its image as a full-bleed background, with the title and BB price overlaid on top.

### Changes (single file)

`src/components/ProductShelf.tsx` — restructure the `<button>` for each product:

- Make the button `relative aspect-square` (square tile), remove the inner 40×40 thumbnail box and the flex column layout.
- Render the `image_url` as an absolutely-positioned `<img>` filling the button (`absolute inset-0 w-full h-full object-cover`).
- Add a bottom gradient overlay (`absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/50 to-transparent`) so text stays legible over any photo.
- Stack name + price in a `relative z-10` container pinned to the bottom (`absolute bottom-0 left-0 right-0 p-1.5`), title in white, price row (BB coin + amount) directly under it in neon orange.
- Fallback when `image_url` is missing: keep current `bg-muted` background so the tile still shows name/price cleanly.
- Keep the existing 3-column grid, tap handler, "Official Gear" footer label, and `GearPurchaseModal` wiring untouched.

No backend, schema, or other components touched.
