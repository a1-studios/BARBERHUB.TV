

# Compact Product Shelf — Single Row, Icon-Sized

## Problem
The current product shelf cards are too large (140px wide, 100px image height + text + button). They overflow and require horizontal scrolling. The user wants all 3 products visible in a single row, much smaller — icon-sized images with a clean, official look.

## Changes

### File: `src/components/ProductShelf.tsx`

Redesign the layout to be a compact, non-scrollable single row:

1. **Remove horizontal scroll** — replace `overflow-x-auto snap-x` with a simple `flex` row that fits all 3 items equally across the viewport
2. **Shrink product cards dramatically** — each card becomes a small pill/tile:
   - Thumbnail image: ~40x40px rounded square (icon-sized)
   - Product name in tiny text beside or below the icon
   - Price as small muted text
   - Small "Shop" link or tap the whole card
3. **Remove the large "Buy Now" button** — the entire compact card is tappable as a link
4. **Layout**: 3 equal-width columns in a single row using `grid grid-cols-3 gap-2`, each item centered
5. **Keep the "Official Gear" header** but make it smaller (text-xs)
6. **Total section height**: ~70-80px max including header

Visual structure per item:
```text
┌──────────────┐
│  [40px img]  │
│  Cape  $39   │
└──────────────┘
```

No other files change — only `ProductShelf.tsx`.

