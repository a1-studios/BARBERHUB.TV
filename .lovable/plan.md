# Fix Watch Feed: Deep-Link & Tap-to-Play

## Problems

1. **Random video bug**: Clicking a hero video sends users to a different video.
   - `DynamicBattleHero` navigates with `/watch?video=<media_url>`.
   - `WatchFeed` matches the param against `feed[i].media_url`, but:
     - The feed is shuffled + interleaved (sponsors/battles every N items).
     - Items from the `featured_videos` table may not exist in the content-derived feed at all.
   - When the match fails (or before the data loads), the user lands on shuffled index 0 → looks random.

2. **Autoplay issues on Watch page**: `forceActive={isActive}` makes `SmartVideoPlayer` auto-play immediately. The user wants to tap Play (which previously resolved playback hangs).

## Changes

### 1. Reliable deep-link routing (`src/pages/DynamicBattleHero.tsx` + `src/pages/WatchFeed.tsx`)

- Hero: pass a richer identifier so we can always reconstruct the target:
  - Use `content_id` when available (preferred), else fall back to `media_url`.
  - Navigate to `/watch?v=<id_or_url>&src=<encoded_media_url>` so WatchFeed can always render the exact clip even when it isn't in the fetched feed.
- WatchFeed:
  - Read both `v` (id/url) and `src` (raw media URL) params.
  - Resolve target by `content_id === v` OR `media_url === v` OR `media_url === src`.
  - If no match in `feed`, build a **synthetic feed item** from `src` (and lightweight metadata fetched by id if available) and **prepend it at index 0**. Initialize `activeIndex = 0` so the user always lands on the clicked video, instantly.
  - Keep the rest of the shuffled feed below for continued scrolling.
  - Move the deep-link resolution **before** the shuffle/initial render so there is no flash of a wrong video.

### 2. Tap-to-play on Watch feed (`src/pages/WatchFeed.tsx` + `src/components/video/SmartVideoPlayer.tsx`)

- Add per-item `userPlayed` state in WatchFeed (Set of indices the user tapped).
- Pass a new `requirePlayTap` prop to `SmartVideoPlayer`. When true, the player will:
  - Never call `play()` automatically (even when `forceActive` is true).
  - Always render the centered Play button while paused.
  - Only start playback after the user taps the button.
- In WatchFeed, the active item starts paused with a big Play overlay; tapping marks it as `userPlayed` and the player begins playback. Scrolling to the next item resets to paused (consistent behavior).
- Keep prefetch (`preloadMode='auto'`) so playback is instant on tap.

### 3. No business-logic changes
Strictly UI/playback + routing. No DB, no edge functions touched.

## Files

- `src/components/DynamicBattleHero.tsx` — update the click handler to include `content_id` + `src` query params.
- `src/pages/WatchFeed.tsx` — resolve deep link to index 0 (with synthetic fallback), add `userPlayed` state, pass `requirePlayTap` and gate `forceActive`.
- `src/components/video/SmartVideoPlayer.tsx` — add `requirePlayTap` prop; when set, skip auto `play()` and always show the centered Play button until tapped.

## Acceptance

- Clicking any hero video opens `/watch` already scrolled to **that exact clip** — never a different one.
- Watch feed items do not start playing on their own; user sees the poster + a centered Play button and taps to begin.
- Scrolling between items pauses the previous one and shows Play on the next; no double-audio.
