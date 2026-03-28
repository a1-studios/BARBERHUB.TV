

# Challenge Barber Dropdown + WatchFeed Video Fixes

## Changes

### 1. ChallengeModal: Preloaded barber dropdown (src/components/battles/ChallengeModal.tsx)

Currently barbers only appear after typing 2+ characters in the search box. The modal should **auto-load all available barbers** when it opens so users can browse and pick from a list immediately.

- On modal open, fetch barbers from `public_barber_profiles` (limit 20, excluding self)
- Show them in a scrollable list below the search input — always visible, no typing required
- Search input **filters** the preloaded list in real-time (client-side filter)
- Keep the existing selection → stake slider → challenge flow unchanged
- Add a "Available Barbers" header above the list

### 2. WatchFeed: Play videos once, not looped (src/pages/WatchFeed.tsx)

Non-battle videos (portfolio, educator, platform content) currently have `loop` set to `true`. The user wants videos to play for their full duration and stop.

- Remove `loop` attribute from the `<video>` element in `renderVideoItem`
- When video ends, show a replay button overlay so user can watch again if desired
- Keep `autoPlay` behavior on scroll-snap (play when visible, pause when scrolled away)

### 3. Confirm: No video content on landing page

Verified that `Index.tsx` does **not** render `battle_submissions` or portfolio videos. The landing page shows `DynamicBattleHero` (live battles only), `LiveBattleFeed`, and `GlobalLeagueDashboard`. No changes needed here.

---

## Files to modify

| File | Change |
|------|--------|
| `src/components/battles/ChallengeModal.tsx` | Auto-load barbers on open, show browsable dropdown list |
| `src/pages/WatchFeed.tsx` | Remove `loop` from non-battle videos, add replay overlay on end |

