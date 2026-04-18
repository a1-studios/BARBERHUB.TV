

## Goal
Replace the bulky **`LiveBarberStreams`** card grid with a compact **floating pill** anchored just under the header that shows live activity at a glance — a single circle for solo broadcasts, a stacked-pair of circles for live challenges/battles. Keep the existing avatar style from `LiveNowBanner`. Remove the large widget entirely.

## Current State (per screenshot)
- `FanArenaView.tsx` renders both `LiveNowBanner` (avatar circles, already good) AND `LiveBarberStreams` (the giant "LIVE NOW · Watch live battles and broadcasts" card with the orange Solo Broadcast tile + Watch Live button) → redundant + bulky.
- Live battles/challenges have no quick visual indicator anywhere — fans can't see "two barbers are battling right now."

## Fix

### 1. Create new `LiveActivityPill` component (`src/components/battles/LiveActivityPill.tsx`)
- Fixed-positioned pill, anchored `top: 80px` (right under the floating header), centered horizontally, `z-40`
- Single horizontal scrollable row of small avatar bubbles, same red-pulse-ring styling as `LiveNowBanner`
- Two avatar shapes:
  - **Solo broadcast** → single circle (40px), pulsing red ring → tap routes to `/broadcast/{barber_id}`
  - **Live battle/challenge** (status `active` / `voting` / `waiting_for_opponent` with both barbers present) → **stacked pair**: two overlapping 36px circles (second offset right -12px / down +6px), wrapped in a single combined red-orange gradient ring with a tiny crossed-swords icon badge → tap routes to `/battle/{id}/theater`
- Container: subtle `bg-background/70 backdrop-blur-md border border-primary/30 rounded-full px-3 py-1.5 shadow-lg` so it floats elegantly below the header
- Auto-hides when no live activity (`return null`)
- Reuses queries from existing `LiveNowBanner` (solo broadcasts) + a new battles query (`status IN ('active','voting','waiting_for_opponent')` with both barbers joined) + realtime subscription on `barber_profiles` and `battles`

### 2. Update `FanArenaView.tsx`
- Remove `<LiveNowBanner />` (replaced by pill)
- Remove `<LiveBarberStreams />` (the bulky widget the user wants gone)
- Keep everything else

### 3. Mount `LiveActivityPill` globally
- Add `<LiveActivityPill />` inside `Header.tsx` (just after the closing `</header>` element so it lives at the same fixed root) → appears on every page under the header, not just fan arena

### 4. Files Touched
| File | Change |
|---|---|
| `src/components/battles/LiveActivityPill.tsx` | **New** — floating pill with single circles (solo) + stacked-pair circles (battles) |
| `src/components/Header.tsx` | Mount `<LiveActivityPill />` after the `</header>` close so it floats globally |
| `src/components/fan/FanArenaView.tsx` | Remove `<LiveNowBanner />` and `<LiveBarberStreams />` imports + usages |
| `src/components/battles/LiveNowBanner.tsx` | **Keep file** but no longer rendered (legacy — can stay for future use) |
| `src/components/battles/LiveBarberStreams.tsx` | **Keep file** but no longer rendered on the home feed (still usable elsewhere if needed) |

## Result
- Home feed loses the giant orange "Solo Broadcast / Watch Live" card → cleaner, video-first.
- Right under the header sits a tiny floating pill: one circle = solo broadcast, two stacked circles with crossed-sword badge = live challenge/battle.
- Tapping a single circle → solo broadcast viewer. Tapping a stacked pair → battle theater (split-screen).
- Pill auto-hides when nothing is live, so the UI stays pristine.

