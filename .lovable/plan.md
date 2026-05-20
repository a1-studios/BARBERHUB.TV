## Goal
Give Sovereign HQ full control to add, edit, and remove Official Gear items (with media), keep Sovereign HQ as the source of truth, and tie purchases to Barber Bucks. Shopify is used for fulfillment of physical orders only.

## Approach
Reuse the existing `public.products` table (already has `category='gear'`, `price_bb`, `image_url`, `is_active`, `stock_quantity`) — no new product schema needed. Add a new admin panel mirroring the look of `AffiliateControlPanel`, with image upload to Supabase Storage + paste-URL fallback. Add Shopify SKU/variant linkage so when a fan pays in BB, an order row is created and (optionally) pushed to Shopify for fulfillment.

## Changes

### 1. Database migration
- Create new public storage bucket `gear-media` (public read, admin-only write via RLS on `storage.objects`).
- Add columns to `public.products`:
  - `shopify_product_id text`
  - `shopify_variant_id text`
  - `requires_shipping boolean default false`
  - `display_order integer default 0`
- Create `public.gear_orders` table: `id`, `user_id`, `product_id`, `quantity`, `bb_spent`, `status` (`pending|fulfilled|cancelled`), `shopify_order_id`, `shipping_address jsonb`, timestamps. RLS: user reads own; admins read all; inserts only via edge function.
- Add admin RLS policies on `products` so Sovereign (via `has_role admin` or SOVEREIGN_EMAIL check) can insert/update/delete gear rows. Public read stays as-is.

### 2. New Sovereign HQ panel
`src/components/sovereign/GearControlPanel.tsx` — Robinhood-style, matching `AffiliateControlPanel`:
- List existing gear (image, name, BB price, stock, active toggle, drag-order or numeric `display_order`).
- "Add Gear" form: name, description, price_bb, stock_quantity, requires_shipping, optional Shopify product/variant IDs.
- Image input: tab/toggle between **Upload from device** (drops file into `gear-media` bucket, stores returned public URL) and **Paste URL**.
- Row actions: edit (inline modal), toggle active, delete.

Register the panel in `src/pages/SovereignHQ.tsx` next to `AffiliateControlPanel`.

### 3. Edge function updates
- New `supabase/functions/admin-upsert-gear` — validates caller is admin (SOVEREIGN_EMAIL), upserts/deletes product rows. Avoids granting broad direct table writes from the client.
- Update existing `purchase-product-bb` to:
  - On success, also insert a `gear_orders` row (status `pending` if `requires_shipping`, else `fulfilled`).
  - If `shopify_variant_id` is present and `requires_shipping`, call new helper `shopify-create-order` (stubbed for now; emits log + leaves order `pending` if Shopify not yet connected).

### 4. Shopify integration (lightweight)
- No catalog sync — admins enter Shopify product/variant IDs manually per gear item (since Sovereign HQ is source of truth).
- A follow-up `shopify-create-order` edge function will POST to Shopify Admin API when the Shopify integration is enabled. For this iteration we scaffold the function and gate it behind a `SHOPIFY_ACCESS_TOKEN` env check; if missing, orders stay `pending` for manual fulfillment.

## Out of scope
- Two-way Shopify catalog sync.
- Customer-facing checkout/address collection UI (will be added when first shippable item ships — current `GearPurchaseModal` keeps working for digital/no-ship items).
- Refunds / cancellation flow.

## Files touched
- migration (new tables + bucket + columns + RLS)
- `src/components/sovereign/GearControlPanel.tsx` (new)
- `src/pages/SovereignHQ.tsx` (mount panel)
- `supabase/functions/admin-upsert-gear/index.ts` (new)
- `supabase/functions/purchase-product-bb/index.ts` (extend)
- `supabase/functions/shopify-create-order/index.ts` (new, scaffold)
