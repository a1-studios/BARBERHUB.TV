

## Redesign Sponsor Slides: 3-Column Layout with CTA + BB Incentive

### Current Problem
The sponsor image and text slides are centered with no engagement prompts or BB incentive — wasted space on both sides.

### New Layout for Both `sponsor-image` and `sponsor-text` Slides

Both slides switch to a **3-column layout** (`grid grid-cols-[auto_1fr_auto]`):

```text
┌──────────────────────────────────────────────────┐
│  ▸ TAP   │   LOGO / BRAND NAME    │  🪙 2x BB  │
│          │   slogan (text only)   │   discount  │
│                              Sponsored ──────────┤
└──────────────────────────────────────────────────┘
```

- **Left column**: Subtle pulsing chevron arrow (`ChevronRight` icon from lucide) with tiny "TAP" label — prompts users to click
- **Center column**: The main content (image or brand name + message) — maximized
- **Right column**: Minimalistic BB incentive — small BB coin icon + "2x BB" or "Save with BB" text
- **Sponsored badge**: Moved to absolute bottom-right corner of the container

### Specific Changes

#### 1. `ArenaTicker.tsx` — sponsor-image slide (lines 182-203)
- Switch to `grid grid-cols-[32px_1fr_32px] sm:grid-cols-[40px_1fr_40px] items-center w-full`
- Left: animated `ChevronRight` icon (tiny, pulsing opacity)
- Center: logo image (keep `h-20 sm:h-24`)
- Right: small BB coin image (`h-4 w-4`) + `2x` text in primary color

#### 2. `ArenaTicker.tsx` — sponsor-text slide (lines 204-220)
- Same 3-column grid
- Left: same chevron arrow
- Center: brand name maximized to `text-xl sm:text-2xl lg:text-3xl font-black uppercase` + message below
- Right: same BB incentive widget
- Remove `<SponsoredBadge />` from center flow

#### 3. `ArenaTicker.tsx` — Add absolute-positioned SponsoredBadge
- For both sponsor slide types, render `<SponsoredBadge />` with `absolute bottom-1.5 right-2` positioning inside the outer container (outside the AnimatePresence, conditionally shown when slide type is sponsor)

#### 4. Import additions
- Add `ChevronRight` from lucide-react
- Import bb-coin-logo asset

#### 5. No changes to `SponsoredBadge.tsx` — already the right size

