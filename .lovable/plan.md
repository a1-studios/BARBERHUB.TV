## 1. Fullscreen swipeable image gallery

**New component** `src/components/GearImageLightbox.tsx`
- Portal-rendered fullscreen overlay (black backdrop, z-50)
- Receives `images: string[]`, `startIndex`, `productName`, `onClose`
- Swipe left/right via framer-motion `drag="x"` with snap on threshold (>60px or velocity)
- Tap-arrow buttons on desktop, dot indicators at bottom
- Pinch/double-tap zoom skipped to keep scope tight; close on X or backdrop tap
- Counter "2 / 5" top-left, product name top-center

**Edit** `src/components/ProductShelf.tsx`
- Replace current `handleTap` behavior: tapping the image opens the lightbox instead of the purchase modal
- Add a small "Buy" pill overlay on the card (or keep price area tappable) that opens `GearPurchaseModal` — so purchasing still works
- State: `lightboxProduct` separate from `selectedProduct`

## 2. Shopify integration (connect existing store)

The Lovable Shopify enable tool requires Lovable Cloud, but this project uses an external Supabase. So we'll wire Shopify directly using the **Shopify Admin GraphQL API** with a Custom App access token — same pattern already hinted at by `shopify_product_id` / `shopify_variant_id` columns on `products`.

### Secrets to add
- `SHOPIFY_STORE_DOMAIN` (e.g. `barberhub.myshopify.com`)
- `SHOPIFY_ADMIN_TOKEN` (Admin API access token from a Custom App with `read_products, write_products, read_inventory, write_inventory` scopes)

### New edge function `supabase/functions/shopify-sync-product/index.ts`
Actions:
- `push` — given a local `product_id`, create or update the matching Shopify product (title, body_html=description, price from `price_bb` converted to USD by `price_bb/5`, images from `image_urls`, sku, inventory). Stores returned `shopify_product_id` + first `shopify_variant_id` back on the row.
- `pull` — given a `shopify_product_id`, refresh title/price/images/stock back into local row.
- `list_shop_products` — proxy to fetch existing Shopify products so admin can map an existing Shopify item to a local row.

Sovereign-only (verify caller via existing `has_role` admin check used by `admin-upsert-gear`).

### Admin UI changes in `src/components/sovereign/GearControlPanel.tsx`
- Add a "Sync to Shopify" button on each row (calls `shopify-sync-product` with `push`)
- Add a "Pull from Shopify" button when `shopify_product_id` is set
- Add an "Import from Shopify…" dropdown in the Add Gear form populated by `list_shop_products`, that pre-fills name/price/images and stores the IDs

### Checkout wiring (purchase flow)
- `GearPurchaseModal` stays the BB-based purchase. If a product has `shopify_product_id` AND `requires_shipping=true`, after BB deduction the existing `purchase-product-bb` edge function should also call Shopify's `draftOrderCreate` to fulfill the physical order. Add this step inside `purchase-product-bb` (uses same secrets); creates a draft order tagged with the buyer's email and shipping address, marked paid. Out of scope for this plan to redesign checkout UX — just plumb the fulfillment hand-off.

### Database
No schema changes needed — `shopify_product_id`, `shopify_variant_id`, `requires_shipping` already exist.

## 3. What I will NOT change
- BB economy, prices, tax splits
- Existing purchase-product-bb business logic (only adds Shopify draft order call when applicable)
- Card layout/typography of the gear shelf

## Technical notes
- Shopify Admin REST/GraphQL is called server-side from the edge function with `X-Shopify-Access-Token` header
- Price conversion: `price_usd = price_bb / 5` (per project economy memory)
- Inventory not decremented on Shopify side until the draft order is completed — acceptable for v1
