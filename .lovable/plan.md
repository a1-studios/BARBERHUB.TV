

# E-Commerce Product Shelf + Affiliate Toggle

## Overview
Add a horizontal product carousel below the video player on the landing page, showing 3 hardcoded Barber-Hub Shopify products. Build a backend `affiliate_products` table and a Sovereign HQ toggle to control whether affiliate products also render.

## Database Changes (1 migration)

**New table: `affiliate_products`**
- `id` UUID PK
- `title` TEXT NOT NULL
- `price_cents` INTEGER NOT NULL
- `image_url` TEXT NOT NULL
- `external_link` TEXT NOT NULL
- `product_type` TEXT NOT NULL DEFAULT `'affiliate'` (values: `'proprietary'`, `'affiliate'`)
- `is_active` BOOLEAN DEFAULT true
- `display_order` INTEGER DEFAULT 0
- `created_at` / `updated_at` TIMESTAMPTZ

**New row in `platform_state`** (via insert tool):
- key: `affiliate_network_enabled`, value: `false`

RLS: Public SELECT for active products. INSERT/UPDATE/DELETE restricted to sovereign role via `has_role()`.

## Frontend Changes

### 1. New component: `src/components/ProductShelf.tsx`
- Horizontal scrollable container (snap scroll, no embla needed -- simple `overflow-x-auto` with `snap-x`)
- 3 hardcoded proprietary product cards (Cape, Hat, Razor) with placeholder images, prices, and Shopify checkout links
- Fetches `platform_state` key `affiliate_network_enabled`; if ON, also fetches `affiliate_products` where `is_active = true` and `product_type = 'affiliate'`
- Dark charcoal cards (`bg-[#1a1a2e]`), brand orange `bg-orange-500` "Buy Now" buttons
- Each card: product image, title, price, CTA button linking to external Shopify/affiliate URL
- Compact height (~140px cards) to avoid pushing content

### 2. Insert into `FanArenaView.tsx`
- Place `<ProductShelf />` immediately after `<DynamicBattleHero />`

### 3. Insert into `Index.tsx` (barber view)
- Place `<ProductShelf />` immediately after `<DynamicBattleHero />`

### 4. New Sovereign panel: `src/components/sovereign/AffiliateControlPanel.tsx`
- Toggle switch for `affiliate_network_enabled` platform_state key
- Mini CRUD list for affiliate products (add/edit/remove) with fields: title, price, image URL, external link
- Uses `sovereign-system-control` edge function pattern for the toggle
- Direct Supabase queries for product CRUD (sovereign-only RLS)

### 5. Add to `SovereignHQ.tsx`
- Import and render `<AffiliateControlPanel />` in the main grid

## File Summary

| Action | File | Description |
|--------|------|-------------|
| Migration | SQL | Create `affiliate_products` table + RLS policies |
| Insert | `platform_state` | Add `affiliate_network_enabled = false` row |
| Create | `src/components/ProductShelf.tsx` | Horizontal product carousel component |
| Create | `src/components/sovereign/AffiliateControlPanel.tsx` | Sovereign toggle + affiliate product CRUD |
| Edit | `src/components/fan/FanArenaView.tsx` | Add ProductShelf after DynamicBattleHero |
| Edit | `src/pages/Index.tsx` | Add ProductShelf after DynamicBattleHero (barber view) |
| Edit | `src/pages/SovereignHQ.tsx` | Add AffiliateControlPanel |

