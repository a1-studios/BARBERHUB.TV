## Goal
Make the bottom quick-options bar (BottomNavBar) visually distinct from the content underneath and available on tablets.

## Changes

### 1. Visual treatment — `src/components/BottomNavBar.tsx`
The bar currently has no background; icons float over whatever video/content sits beneath, hurting legibility.

Add a layered treatment using existing semantic tokens (no hard-coded colors):
- A subtle dark backdrop strip behind the bar: `bg-background/70 backdrop-blur-xl`
- A cyan gradient top border (1px) using the project's Zion Blue / cyan token — `bg-gradient-to-r from-transparent via-cyan/70 to-transparent`
- A soft cyan glow above the bar: `shadow-[0_-8px_24px_-8px_hsl(var(--cyan)/0.35)]`
- Keep the FAB orange (primary) — it remains the focal action. Its ring gets a thin cyan outline (`ring-1 ring-cyan/40`) so it pops against the new bar.

Active tab color stays `text-primary` (orange). Inactive icons stay white with drop-shadow.

### 2. Tablet support
Today the nav uses `md:hidden`, hiding it on every device ≥768px (iPad portrait, iPad Pro, etc.).

Replace with `lg:hidden` so it shows on phones AND tablets, and only disappears on true desktop (≥1024px). On wider tablet widths the bar naturally stretches; tab spacing already uses `flex-1` so it scales cleanly.

No other component changes — `QuickActionsMenu` FAB (top-left) is already visible across all viewports.

## Technical notes
- The `cyan` token already exists in the theme (used elsewhere as `text-cyan`). All new classes use semantic tokens.
- Height (`h-11`), safe-area inset, and FAB offset (`-mt-5`) remain unchanged.
- No business logic, routing, or state changes.

## Files touched
- `src/components/BottomNavBar.tsx` (only)
