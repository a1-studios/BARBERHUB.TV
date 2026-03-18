

## Redesign Arena Ticker: 25/50/25 Product Layout + Mobile Swipe

### Layout

**Desktop** (3-column grid):
```text
┌─────────────┬──────────────────────┬─────────────────┐
│  25%        │      50%             │     25%         │
│  Product 1  │  Logo (smaller)      │  Product 2      │
│  (image)    │  + Brand Name        │  + "15% off     │
│             │  + Message           │    with BB"     │
└─────────────┴──────────────────────┴─────────────────┘
```

**Mobile**: Embla carousel with 3 slides — swipe left/right to see Product 1, Center (logo+text), Product 2 with promo badge. Dot indicators at bottom.

### Changes

#### 1. Database Migration
Add 3 columns to `sponsor_ads`:
- `product_image_url_2` text nullable — second product image
- `promo_text` text default `'15% off with BB'` — overlay text on right product
- `product_link` text nullable — click-through for product images

#### 2. Update `useSponsorAds.tsx`
Add `product_image_url_2`, `promo_text`, `product_link` to the `SponsorAd` interface.

#### 3. Redesign `ArenaTicker.tsx` sponsor-image slide
- Remove "Tap" chevron (left) and "2x BB" coin (right) from all sponsor slides
- Reduce logo from `h-20/h-24` to `h-12/h-14`
- Desktop: `grid grid-cols-4` — col 1 = product image 1, cols 2-3 = logo + name + message, col 4 = product image 2 with small promo badge overlay
- Mobile: Use Embla carousel (`useEmblaCarousel`) with 3 slides. Center slide shows logo+text (default visible), swipe to see products. Add dot indicators.
- Promo badge: absolute positioned small pill on top-right of product 2 image showing `promo_text`

#### 4. Update Sovereign `SponsorControlPanel.tsx` form
Add to the create/edit dialog:
- Product Image 1 URL (maps to existing `product_image_url`)
- Product Image 2 URL (maps to `product_image_url_2`)
- Promo Text input (maps to `promo_text`, placeholder "15% off with BB")
- Product Link input (maps to `product_link`)

#### 5. Update `SponsorAdsManager.tsx` form
Add the same 3 new fields (product image 2, promo text, product link) to the admin form for consistency.

### Files Changed

| File | Change |
|------|--------|
| DB migration | Add `product_image_url_2`, `promo_text`, `product_link` columns |
| `src/hooks/useSponsorAds.tsx` | Add 3 new fields to interface |
| `src/components/factions/ArenaTicker.tsx` | Redesign sponsor-image slide: 25/50/25 desktop grid, mobile Embla swipe carousel, remove Tap/2xBB |
| `src/components/sovereign/SponsorControlPanel.tsx` | Add product image 1 & 2 URLs, promo text, product link fields |
| `src/components/admin/SponsorAdsManager.tsx` | Add same new fields |

