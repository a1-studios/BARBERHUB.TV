## Fix mobile landing layout (bottom section)

Two files touched, presentation-only.

### 1. `src/components/landing/FeatureHighlightReel.tsx` — globe slide
- Restructure the `global` slide from `absolute inset-0` with absolutely-positioned slogan into a flex column: `GlobePulse` centered in a flex-1 wrapper, slogan rendered directly underneath with a tight `mt-1` gap so it visually hugs the globe instead of sticking to the bottom of the expanded reel area.
- Update slogan markup to alternate word colors (one word orange, next word white, repeating) instead of the current 2+2 split:
  - "Where" → orange
  - "Barbers" → white
  - "Become" → orange
  - "Legends" → white
- Keep `whitespace-nowrap`, `font-extrabold`, uppercase tracking, and drop-shadow.

### 2. `src/components/landing/VelvetRopeLanding.tsx` — vertical rhythm
- Add breathing space between the reel, rotating CTA, and `LiveStatsRow` by bumping the inner spacers (e.g. `pt-2` → `pt-3 md:pt-4`) and adding a small `gap` / `mt` between the CTA and the stats so the EARN-BB button, 500+/1.2k+/5k+/98% row, and the slogan above no longer feel crammed.
- No changes to OTP, footer, or any business logic.

### Out of scope
- No changes to GlobePulse internals, CTA component, stats component, routing, or data.
