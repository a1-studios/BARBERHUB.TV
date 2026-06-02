## Issue
The rotating CTA currently sits below the dots/stats. User wants it placed in the empty space directly under the 3D globe and above the `500+ / 1.2k+ / 5k+ / 98%` stats row.

## Fix

**`src/components/landing/FeatureHighlightReel.tsx`**
- Remove the `LiveStatsRow` from inside the globe slide's `render`. The globe slide should render only the globe (full-bleed).
- Add an optional `belowSlide` slot (or simply render `children` after the slide container and dots) so the parent can inject the CTA + stats stack beneath the reel.
- New flex column order inside the reel wrapper:
  1. Slide area (`flex-1` — globe gets all available vertical room)
  2. Dots
  3. `children` (CTA, then stats — provided by parent)

**`src/components/landing/VelvetRopeLanding.tsx`**
- Pass the CTA and `LiveStatsRow` as children of `<FeatureHighlightReel>` so they render in this order directly under the globe:
  - `RotatingJoinCTA` (centered, small top margin)
  - `LiveStatsRow` (existing component)
- Remove the separate `RotatingJoinCTA` block currently below the reel.

## Result
- Globe stays full-bleed and gets more height.
- CTA sits in the previously empty zone immediately under the globe.
- Stats row sits just under the CTA, above the OTP input.
- No business-logic changes — layout only.