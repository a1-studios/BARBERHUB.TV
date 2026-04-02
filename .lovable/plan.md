

# BB-Native Product Shelf Purchase Flow

## Overview
Convert the ProductShelf from external Shopify links to an in-app Barber Bucks purchase flow. The existing `products` table and `purchase-product-bb` edge function already handle BB deduction, transaction logging, and order creation — we just need to wire the frontend to use them instead of external links.

## Database Changes (1 migration)

**Seed 3 proprietary products into the `products` table** (if not already present):
- Cape: `price_bb = 200`, `price_usd_cents = 3999`, category `gear`
- Snapback: `price_bb = 150`, `price_usd_cents = 2999`, category `gear`
- Razor: `price_bb = 250`, `price_usd_cents = 4999`, category `gear`

Use `ON CONFLICT` on name to avoid duplicates. Mark all as `is_active = true`.

## Frontend Changes

### 1. Rewrite `src/components/ProductShelf.tsx`
- Remove hardcoded `PROPRIETARY_PRODUCTS` array and external `<a>` links
- Fetch products from `products` table where `category = 'gear'` and `is_active = true`
- Display price in BB (e.g., "200 BB") instead of USD
- On tap, trigger purchase logic (not navigation)
- Purchase flow:
  - If not authenticated → show auth prompt
  - Check BB balance from `useBarberBucks` hook
  - **Sufficient funds** → call `purchase-product-bb` edge function → show success toast
  - **Insufficient funds** → open `AddFundsModal` with the deficit amount highlighted
- Keep the compact grid layout (grid-cols-3, icon-sized cards)
- Add loading/disabled state on the tapped card during purchase
- Show success animation (toast + brief checkmark) on completion

### 2. New `src/components/GearPurchaseModal.tsx`
A lightweight confirmation modal (not a full page) shown before deducting BB:
- Product image, name, BB price
- Current wallet balance
- "Confirm Purchase" (orange) / "Cancel" buttons
- If balance insufficient: show deficit, "Add BB" button opens AddFundsModal
- Uses `createPortal` to render as sibling (per existing modal pattern)
- Calls `supabase.functions.invoke('purchase-product-bb', { body: { product_id, quantity: 1 } })`
- On success: invalidate `barber_bucks` query, show toast, close modal
- On error: show error toast

### 3. Minor update to `AddFundsModal`
- No structural changes needed — it already handles the "add funds" flow
- The GearPurchaseModal will open it as a sibling when funds are insufficient

## State Preservation
- No navigation occurs during purchase — everything is modal-based
- Video player continues playing in the background
- Modal uses portal rendering to avoid disrupting the component tree

## File Summary

| Action | File | Description |
|--------|------|-------------|
| Migration | SQL | Seed 3 gear products into `products` table |
| Rewrite | `src/components/ProductShelf.tsx` | Fetch from DB, BB prices, tap-to-purchase |
| Create | `src/components/GearPurchaseModal.tsx` | Confirmation modal with balance check |

