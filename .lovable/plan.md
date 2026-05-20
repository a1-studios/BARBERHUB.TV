# Fix Watch feed playback + add center play/replay control

## Goal
Make videos on `/watch` actually start playing on mobile, and give users a clear centered control to start, resume, or replay the current item.

## Root cause
The active video is mounting with the right source, but it can stay paused because Watch feed restores a saved unmuted preference. On mobile, autoplay is blocked when a video starts unmuted. Right now `SmartVideoPlayer` catches that failure silently, so the feed looks stuck.

## Plan

### 1. Force safe autoplay on Watch feed
Update `src/pages/WatchFeed.tsx` so Watch feed always **starts muted** instead of restoring the persisted mute preference on first load.

- Replace `usePersistedMute()` in Watch feed with local `useState(true)`.
- Keep the existing mute/unmute button so users can turn sound on after playback begins.
- Scope this change to `/watch` only; other pages can keep their current mute behavior.

### 2. Harden `SmartVideoPlayer` against blocked play()
Update `src/components/video/SmartVideoPlayer.tsx` so a blocked autoplay does not fail silently.

- When `video.play()` rejects, detect autoplay-style failures.
- Retry once with `video.muted = true` before giving up.
- Track a lightweight playback state such as `showPlayOverlay` / `playbackBlocked`.
- Add wrapper click behavior so tapping the video surface attempts playback again.

### 3. Add centered play/replay UI on the Watch feed videos
Add a clear centered control overlay for the active player.

- **When autoplay is blocked or the video is paused:** show a centered Play button.
- **When the video has ended:** show a centered Replay button using the existing replay logic.
- Use Lucide icons already in the project (`Play`, `RotateCcw`).
- Keep the styling minimal and mobile-first so it reads clearly over video without blocking the rest of the watch UI.

### 4. Make replay behavior match the new control
Adjust Watch feed end-of-video behavior so replay is actually possible.

- Do not immediately auto-scroll away from the current video on `ended`.
- Let the centered Replay control handle replay for the current item.
- Users can still swipe to the next item normally.

## Files to update
- `src/pages/WatchFeed.tsx`
- `src/components/video/SmartVideoPlayer.tsx`

## Out of scope
- No DB, Supabase, or Cloudflare changes.
- No redesign of the feed layout.
- No changes to other pages unless they share the same reusable player behavior needed for the centered overlay.

## Expected result
- Watch feed videos start reliably on mobile.
- If autoplay is blocked for any reason, users see an immediate centered Play control instead of a stuck video.
- When a video ends, users can replay it from the center of the screen.