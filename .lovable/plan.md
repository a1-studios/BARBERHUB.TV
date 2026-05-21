## What’s actually wrong

I found two concrete playback problems:

1. **Portfolio modal videos can’t start because the player never attaches a source in manual mode.**  
   In `SmartVideoPlayer`, `manualPlayback` disables autoplay, but the component still only attaches media when `shouldPlay` is true. In the portfolio dialog, `shouldPlay` stays false, so the `<video>` ends up with an empty source until something else activates it. Result: the play button appears, but the video has nothing loaded.

2. **Watch Feed deep-linked videos can fall back to a raw MP4 without a `cloudflare_stream_uid`, and that path is unstable.**  
   The current `/watch?video=...&src=...` route can build a synthetic feed item from only the URL. That means the player loses the Cloudflare Stream path and uses the raw CDN MP4 instead. In the live preview I saw repeated aborted media requests for `https://media.barberhub.tv/portfolios/1779401470526_studio.mp4`, while the visible video element never stabilized with a real `currentSrc`.

## Implementation plan

1. **Fix `SmartVideoPlayer` attach logic for manual playback**
   - Make manual players attach/load media even when autoplay is off.
   - Keep autoplay disabled, but allow the user-triggered Play button to work immediately.
   - Preserve existing Watch Feed autoplay behavior for active feed cards.

2. **Stabilize Watch Feed deep-link resolution**
   - When `/watch` receives a direct `src` URL, look up the matching record in `creations` / `creator_content` / `battle_submissions` before creating a synthetic fallback item.
   - If a matching record exists, hydrate the feed item with `cloudflare_stream_uid`, thumbnail, title, and creator info so playback uses the optimized Stream source.
   - Only use the raw URL fallback when no matching record exists anywhere.

3. **Harden raw MP4 fallback behavior**
   - Ensure direct MP4 playback does not get detached/restarted unnecessarily when the feed re-renders.
   - Verify replay/manual play still works when a real Stream UID is unavailable.

4. **Validate both broken paths**
   - Portfolio modal: tap play once, video starts, no autoplay, no loop.
   - Watch Feed: deep-linked clip loads as first card, starts when tapped, replay icon still works after ending.

## Technical details

- Files to update:
  - `src/components/video/SmartVideoPlayer.tsx`
  - `src/pages/WatchFeed.tsx`
  - possibly `src/pages/BarberPublicProfile.tsx` and `src/components/profiles/PortfolioManager.tsx` only if prop wiring needs a tiny adjustment after the player fix
- Evidence from audit:
  - Browser showed repeated `net::ERR_ABORTED` media requests for the failing MP4 in Watch Feed.
  - The deep-linked Watch Feed item currently has no guaranteed `cloudflare_stream_uid`.
  - The failing MP4 itself is valid (`h264`, 1280x720), so this is not a bad-file codec issue.

If you approve, I’ll implement the fix directly in those player/feed paths.