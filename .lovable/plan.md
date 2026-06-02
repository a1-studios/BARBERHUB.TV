## Goal

Two things:
1. Make pinch/zoom/drag on the globe feel native on mobile — no drift, no jump, no fighting the page.
2. When a user taps a marker and hits "Find Near You" or "Book Now", show a teaser modal with 3 sample barber profiles and prompt them to sign up to continue.

---

## Part 1 — Mobile-native gestures (`src/components/ui/cobe-globe-pulse.tsx`)

Current bugs causing drift/jump:
- Pointer events AND touch events both fire on iOS, so a single finger triggers `pointerdown` drag AND the touch handler — values race.
- Pinch start doesn't cancel the in-flight pointer drag, so when a second finger lands the globe lurches.
- `touchAction: "none"` on container blocks page scroll always, but our pointer handler still uses raw deltas without DPR/zoom compensation, causing "drift" feel.
- `transform: scale(zoom)` on the wrapper scales the canvas pixels (blurry on zoom) and the math uses `zoomRef` again in projection → double-applied scaling.

Fix:
- Drive everything from a single source: `touch` events on mobile (detected once), `pointer` events on desktop. No mixing.
- Track gesture state machine: `idle | pan | pinch`. Transition cleanly:
  - 1 touch → `pan`, record start position.
  - 2 touches → `pinch`, snapshot midpoint + distance + current phi/theta/zoom; ignore pan deltas until back to ≤1 touch.
  - touchend with 1 finger remaining after pinch → re-seed pan baseline (prevents jump).
- Replace `transform: scale(zoom)` wrapper with projection-only zoom (already in `projectGroup` via `zoomRef`). Remove the CSS transform so canvas stays crisp and there's no double-scale.
- Drag sensitivity normalized to `rect.width` (not `clientWidth` which can be 0 mid-mount), divided by current zoom so panning feels consistent when zoomed in.
- Clamp theta to ±0.55 (was 0.7) to stop the globe flipping upside-down on aggressive swipes.
- `touch-action: none` only on the globe container, with `overscroll-behavior: contain` to stop iOS rubber-band leaking.
- Tap-vs-drag detection: if pointer/touch moved <8px and lasted <300ms, treat as tap → fire `focusMarker`. Otherwise swallow.
- Remove the marker `<button>` hit area in favor of hit-testing in the container's tap handler (projects tap coordinates to nearest marker within 22px). This eliminates the "tap goes through to drag" race entirely.

---

## Part 2 — Sign-up teaser with sample barbers

New component `src/components/landing/BarberTeaserModal.tsx`:
- Trigger: opening from the globe info card's "Find Near You" or "Book Now" buttons when the user is NOT authenticated.
- If user IS authenticated, keep current behavior (navigate to `/barbers` or `/book-barber-near-me`).
- Modal content:
  - Heading tied to action: "Find barbers in {city}" or "Book a barber in {city}".
  - 3 sample barber cards (avatar, name, city/country flag, tier badge, 1-line specialty). Use the small `BarberProfileCard` look but simplified, hard-coded to 3 curated featured barbers (or pull from `useLiveBarberMarkers` if extra profile fields are available — we'll fall back to a `featuredBarbersTeaser` const).
  - Primary CTA: "Create free account" → routes to `/auth?mode=signup&redirect=<original-destination>`.
  - Secondary CTA: "I already have an account" → `/auth?mode=signin&redirect=...`.
  - Small footer: "Free to join. Pay only when you book."

Wire-up in `cobe-globe-pulse.tsx`:
- Replace inline `navigate(...)` in the chip CTAs with a single handler `handleTeaser(action: 'find' | 'book')` that:
  - Reads auth via `useAuth()` (`user` presence).
  - If logged in → navigate as today.
  - If anonymous → open `BarberTeaserModal` with `{ city, country, flag, action }`.

---

## Files

- Edit `src/components/ui/cobe-globe-pulse.tsx` — gesture rewrite, remove wrapper scale, hit-test tap, teaser hook-up.
- Create `src/components/landing/BarberTeaserModal.tsx` — Dialog with 3 sample profiles + sign-up CTAs.
- Create `src/data/featuredBarbersTeaser.ts` — 3 sample barbers (name, city, country, flag, specialty, avatar placeholder).

No backend, route, or schema changes.

---

## Verification

- Mobile viewport 390×844: one-finger drag rotates without canvas blurring; two-finger pinch zooms smoothly; lifting one finger after pinch does not jump; page does not scroll while interacting on globe; tapping a flag marker opens the info card.
- Logged out: tap "Find Near You" → teaser modal with 3 barbers + Sign-Up CTA. Tap "Create free account" → `/auth?mode=signup&redirect=/barbers`.
- Logged in: same buttons navigate straight to `/barbers` and `/book-barber-near-me` (no modal).