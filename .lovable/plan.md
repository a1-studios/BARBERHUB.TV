## Issues
1. On mobile, swiping/dragging the 3D globe triggers the reel's swipe-to-next-slide instead of rotating the globe.
2. Need to maximize vertical real estate so the globe fills available space without crowding header/CTA/OTP/footer.

## Fix

**`src/components/landing/FeatureHighlightReel.tsx`**
- Skip the `onTouchStart`/`onTouchEnd` swipe handlers when the current slide is the globe (`isGlobe`). The globe owns pointer events for rotation; users navigate away from it by tapping the dots below.
- Keep swipe enabled for all other slides.
- Tighten internal padding on globe slide so the globe fills the container (remove the `pb-2` reserved for the stats overlay where possible; let `LiveStatsRow` overlay absolutely at the bottom instead of consuming flex space).

**`src/components/landing/VelvetRopeLanding.tsx`**
- Reduce the `pt-8` above the reel to `pt-3` (mobile) / `md:pt-6` so the globe gets more vertical room; current top gap is excessive on small screens.
- Tighten section gaps (`pt-2` → `pt-1.5`) around CTA/OTP/footer on mobile only so the reel container grows.

**Result:** Globe is freely draggable on mobile (no accidental slide change), and the highlight reel area is taller, giving the globe a larger square render.

No business logic changes — UI/presentation only.