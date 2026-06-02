## Goal
Make the homepage CTAs actually respond, send guests straight into signup when they tap them, and remove the mobile interactions that are causing stutter.

## What I’ll change

### 1. Fix the broken CTA flow on the homepage globe
- Update the CTA path used by the homepage globe/reel so tapping **Find Near You** or **Book Now** always does something.
- For guests: open the existing signup/onboarding flow immediately instead of landing on a dead state.
- For signed-in users: keep the current route behavior to `/barbers` or `/book-barber-near-me`.

### 2. Make the guest landing actually react to `?tab=signup`
- Wire `VelvetRopeLanding` to read the query param and auto-open `LaunchWizard`.
- This fixes the current mismatch where the teaser modal navigates to `/?tab=signup` but the guest landing never consumes it.

### 3. Remove laggy mobile globe interactions
- Disable mobile drag/pan interaction on the cobe globe.
- Keep only lightweight tap behavior on visible markers/chips.
- Remove `touchAction: none` / gesture handling that blocks normal scrolling and causes extra work on mobile.
- Preserve desktop interaction if it’s still useful, but make mobile tap-only.

### 4. Remove swipe/drag navigation from the signup wizard on mobile
- Disable horizontal drag gestures in `SwipeableStep` for mobile so the role chooser and auth steps don’t stutter.
- Keep tap buttons for forward/back so the flow remains clear and fast.
- This specifically targets the “choose your role” screen the user called out.

### 5. Reduce extra animation cost on the guest entry flow
- Trim the heaviest mobile-only motion in the globe / reel path where it impacts responsiveness most.
- Keep the visual style, but prioritize smooth taps over draggable effects.

## Technical details
- Files likely involved:
  - `src/components/ui/cobe-globe-pulse.tsx`
  - `src/components/landing/BarberTeaserModal.tsx`
  - `src/components/landing/VelvetRopeLanding.tsx`
  - `src/components/coming-soon/SwipeableStep.tsx`
  - potentially `src/components/landing/FeatureHighlightReel.tsx`
- Root cause already identified:
  - guest CTA currently navigates to `/?tab=signup`
  - `LandingHero` listens for that query param, but unauthenticated users now see `VelvetRopeLanding`, not `LandingHero`
  - so nothing opens
- Validation after implementation:
  - tap **Find Near You** as guest -> signup wizard opens
  - tap **Book Now** as guest -> signup wizard opens
  - tap marker / CTA on mobile -> no drag/pinch behavior, no dead tap
  - role chooser remains responsive on mobile without swipe/drag lag