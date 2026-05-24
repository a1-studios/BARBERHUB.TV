## What's wrong now

1. **Header reads "Barber Hub"** — should be `BARBER-HUB` all caps.
2. **Live battle still shows fallback Marco/Diego** — root cause: `battles.barber1_id` / `barber2_id` reference `barber_profiles.id`, NOT `auth user_id`. Our query joins `public_user_profiles` on `user_id`, so it returns 0 rows → fallback fires. Same hidden bug will hit any code that assumes barber IDs == user IDs.
3. **PK card is left/right** — user wants top/bottom split (matches the vertical phone form factor and the real Theater feed).
4. **VS badge looks off-center** — it's centered on the card root but the headline strip above pushes the visual midline; needs to sit on the actual seam between the two stacked tiles.
5. **Lots of dead vertical space** in every card — under-using the ~520px stage on a 390×782 viewport.
6. **Open Challenges shows fallbacks** — DB only has expired/completed rows; we need to widen the query (include `accepted`/recent + show "waiting for challenger" empty-state when truly none) instead of inventing fake stakes.
7. **No interactive 3D element** — user wants a globe slide they can spin/drag, with clickable barber pins that open the auth modal.

## Plan

### 1. Header → `BARBER-HUB`
`VelvetRopeLanding.tsx`: replace the two `<span>`s with one uppercase wordmark — `BARBER` in white + `-HUB` in primary, `tracking-[0.15em]` for the editorial feel. Keep the spinning pole + cyan pulse chrome.

### 2. Fix barber-id resolution (real data, no more fake Marco/Diego)
`useLandingData.ts → useLiveBattle`:
- After fetching the battle row, collect both `barber1_id` and `barber2_id`.
- Query `barber_profiles` with `select('id, user_id')` filtered by those IDs to translate profile-id → auth user-id.
- Then query `public_user_profiles` on the resolved `user_id`s for `display_name`, `avatar_url`, `country_code`.
- Return both barbers fully populated. Drop the fallbacks from `LiveNowCard` (only show a subtle "warming up" state if truly null).

Also relax the battle filter so we always find one: prefer `status='live'`, fall back to most recent `status IN ('live','active','upcoming')` regardless of streaming flags.

### 3. Live PK card → vertical (top/bottom) + centered VS
`LiveNowCard.tsx`:
- Switch grid from `grid-cols-2` to `grid-rows-2` (full-width tiles stacked).
- Top tile: barber 1, orange gradient, "LIVE" pill top-left, name + flag bottom-left.
- Bottom tile: barber 2, cyan/blue gradient, viewer count top-right, name + flag bottom-right.
- VS badge anchored to the horizontal seam: `top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2` inside the grid container (not the outer card), so it sits exactly on the divider.
- Add a thin animated divider line (orange→cyan gradient) across the seam to sell the "PK" feel.
- Use the freed vertical space: big animated avatar on each side (h-28 w-28), real name, country flag, and a tiny "12 votes / sec" ticker underneath the seam.

### 4. Use empty space — denser teasers
- **TopBarbersCard**: add a 2-row "rising stars" strip below the podium — 4 small avatar chips of barbers 4-7 from the same query (already fetching 6).
- **BookingCard**: add 3 next-available time pills (e.g. "Today 4:30 / 6:15 / Tomorrow 9:00") under the featured barber to tease real-time booking.
- **ChallengesCard**: real-data query change → fetch latest 3 of any status, then re-bucket: `open` shows live TTL, `accepted` shows "matched", `expired/completed` rendered greyed as "history" so the card never falls back to invented stakes. If there are 0 rows globally, show a single empty-state card "Be the first to throw a stake".
- **WatchFeedCard**: shrink phone frame, add a side rail with 2 tiny vertical-clip thumbnails labelled "Up next" so the static feel goes away.

### 5. New slide — interactive 3D Barber Globe
Add `BarberGlobeCard.tsx` (new 6th slide).
- Pure CSS-3D / Framer-Motion sphere — no Three.js dependency. A wrapper `div` with `transform-style: preserve-3d` rotated by `rotateX/rotateY` springs that follow pointer drag (and a slow auto-rotate when idle, paused while the user is dragging).
- Place ~14 barber "pins" on the sphere using fibonacci-sphere lat/long → translateZ + rotateY/rotateX so they live on the surface. Each pin = the barber's avatar + flag + name on hover.
- Data source: reuse `useTopBarbers()` (already fetches 6) and extend the query to `limit(14)`, ordered by recency. Pins for missing rows are filled with country-flag emoji "ghost" pins.
- Drag: `onPointerDown/Move/Up` → update two `useMotionValue`s, applied via `useTransform` to `rotateX/rotateY`. Inertia via `animate(value, target, { type: 'spring' })`.
- Click a pin → calls a prop `onPinClick(barber)` → bubbles up to `InsideTheHubStage` → up to `VelvetRopeLanding`, which opens `AuthModalV2` with a new "preview" mode showing the barber's name/avatar above the existing role + VIP code flow ("Sign up or redeem a VIP invite to view <name>'s profile").
- Auto-rotation pauses while the user interacts; the carousel auto-advance also pauses while pointer is down on the globe (extend the existing `pausedUntil` in `InsideTheHubStage`).
- Header chip: "Global Barbershop · Spin to explore", subtle radial glow behind the sphere, country grid backdrop.

### 6. Wire pin → auth modal
- `VelvetRopeLanding`: add `previewBarber` state. New `openAuthForBarber(barber)` sets `previewBarber`, sets `mode='signup'`, opens modal.
- `AuthModalV2`: accept optional `previewBarber` prop. When set and on the first step, render a top "card" with avatar + name + flag + tagline "Inside, you can book, follow, and throw down with <name>."

### 7. Slide order in `InsideTheHubStage`
`live → globe → top → book → challenges → watch` (globe second so it's the user's first wow after the live PK).

```text
┌─────────── stage 520px ───────────┐
│  Live PK (vertical, full-bleed)   │
│  Globe (drag, 14 barber pins)     │
│  Podium + rising stars strip      │
│  Booking + 3 slot pills           │
│  Challenges (real, no fakes)      │
│  Watch feed + side rail           │
└───────────────────────────────────┘
```

## Technical notes

- No DB migration needed — all changes are read-side query reshaping. `barber_profiles` and `public_user_profiles` are already public-readable.
- Globe uses CSS 3D transforms only. No new dependency. Framer-motion is already in the project.
- All copy/colors stay on the existing tokens: orange (`#f97316`), cyan, deep-black `#0a0a0f`. No raw white/black tailwind classes added.
- Pin clicks on the globe **only** open the auth modal for unauthenticated visitors (which is the only state on this landing route). No deep linking yet — that comes once they're inside.

## Files

**Edit**
- `src/components/landing/VelvetRopeLanding.tsx` — header caps, previewBarber state, globe pin handler
- `src/components/landing/InsideTheHubStage.tsx` — add globe slide, plumb `onPinClick`, pause-on-drag
- `src/components/landing/teasers/useLandingData.ts` — fix `useLiveBattle` join via `barber_profiles`, widen `useOpenChallenges`, bump `useTopBarbers` to 14
- `src/components/landing/teasers/LiveNowCard.tsx` — vertical split, centered VS, real-data only
- `src/components/landing/teasers/TopBarbersCard.tsx` — rising-stars strip
- `src/components/landing/teasers/BookingCard.tsx` — 3 slot pills
- `src/components/landing/teasers/ChallengesCard.tsx` — real-data buckets, empty state
- `src/components/landing/teasers/WatchFeedCard.tsx` — side rail
- `src/components/auth/AuthModalV2.tsx` — optional `previewBarber` header card

**Create**
- `src/components/landing/teasers/BarberGlobeCard.tsx` — interactive 3D sphere

## Out of scope
- Three.js / WebGL globe (CSS-3D is enough at this density, keeps bundle lean).
- Real booking-slot data (UI tease only — slots come from authed flow).
- New roles / DB writes.
