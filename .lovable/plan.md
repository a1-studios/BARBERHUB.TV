## Goal

Two related issues to fix:

1. Text overlays the user adds in the Camera Studio editor reach the database (`creations.overlay_payload`) and Cloudflare Stream ingest, but they are never rendered back when the published video plays. So from the user's perspective the overlay is "lost on publish".
2. Portfolio videos do not play smoothly on mobile (no real loading state, races between IntersectionObserver and manual `play()`, no replay) and Watch feed users cannot easily replay a video.

The fix keeps all changes in the frontend playback layer — no schema or edge-function changes.

---

## 1. Render saved overlays on playback

Create a new component `src/components/video/OverlayCanvas.tsx` that takes an `overlayPayload` and a `currentTime`/`duration` and renders absolutely-positioned text overlays scaled to the player size (same math as `RecordingReviewSheet`'s preview: `left/top` are 0..1 percentages, `font_size * scale`).

Wire it into `SmartVideoPlayer`:
- Add optional `overlayPayload?: any` prop.
- Track playback time via `onTimeUpdate` (native fallback) and via the Cloudflare Stream `<Stream>` `onTimeUpdate` callback.
- Mount `<OverlayCanvas>` absolutely over the player when `overlayPayload?.overlays?.length > 0`.

Pass `overlayPayload` from the three feed sources in `WatchFeed.tsx`:
- `creations` query → select `overlay_payload`
- `creator_content` query → select `overlay_payload`
- `battle_submissions` query → no change (no overlays today)

Also pass it in `PortfolioManager.tsx` so the same overlays show on the barber's own portfolio grid.

This is the actual user-visible "save" — once overlays render on playback, the round-trip is complete.

## 2. Robust mobile video playback

Refactor `SmartVideoPlayer.tsx` to remove the race between IntersectionObserver and manual `play()`:

- Keep a single `<video>` (or Cloudflare `<Stream>`) per item.
- Use `canplay` event to drive a `loading` state and show a centered spinner overlay while buffering, instead of black frames.
- Coalesce play/pause: only call `.play()` once `readyState >= 2` and the element is the active video; cancel pending promises on unmount via an `AbortController`-style flag.
- Always set `playsInline`, `muted` initial, `preload="metadata"` for non-active and `preload="auto"` for active (already done in WatchFeed — extend to PortfolioManager).
- Add `onError` → toast + retry once with cache-busted URL (helps with flaky R2 first-byte on mobile Safari).
- Ensure `crossOrigin="anonymous"` only when captions are present (avoids R2 CORS preflight failures we just saw on the watch page).

Memoize the captured `videoRef` map in `WatchFeed.tsx` so the auto-play effect doesn't churn on every feed re-render (current `useEffect` deps include `feed.length` and runs across all refs each tick).

## 3. Replay support

Per user choice: Portfolio grid = "Both" (replay button + tap-to-replay). Watch feed ending = "Auto-next" (keep current behavior, unchanged).

In `SmartVideoPlayer`:
- Add `enableReplay?: boolean` (default false).
- When the video ends and `enableReplay` is true:
  - Show a centered Replay button (RotateCcw icon, neon-orange branded).
  - Tapping anywhere on the player surface restarts (`currentTime = 0; play()`).
  - Suppress this when `loop` is true or `onEnded` is provided (Watch feed auto-next path).

Enable `enableReplay` in `PortfolioManager.tsx` and `BarberPublicProfile.tsx` portfolio grid. Leave `WatchFeed.tsx` unchanged so auto-next continues to work.

---

## Technical notes

- Overlay math: `fontSize = payload.style.font_size * (containerWidth / payload.reference_resolution.width)`. Falls back to `* 0.5` (same as review sheet) when reference is missing.
- Cloudflare `<Stream>` exposes `onTimeUpdate` via the react wrapper — same callback signature as a native video event.
- No DB changes needed; `overlay_payload` already populated for `creations` and `creator_content`.
- We do NOT burn overlays into the video server-side. They are a transparent HTML layer over the player, which keeps the video file untouched and editable.

## Files

Create:
- `src/components/video/OverlayCanvas.tsx`

Edit:
- `src/components/video/SmartVideoPlayer.tsx` — overlays, loading state, replay, play/pause coalescing
- `src/pages/WatchFeed.tsx` — select `overlay_payload` in 2 queries, pass to `SmartVideoPlayer`
- `src/components/profiles/PortfolioManager.tsx` — fetch `overlay_payload`, pass to player, enable replay
- `src/pages/BarberPublicProfile.tsx` — pass `overlay_payload` and enable replay where portfolio videos render

## Out of scope

- Server-side overlay burn-in (Cloudflare Stream watermarks API)
- Trim/sound persistence on playback (UI exists; will be a follow-up once overlays are validated)
- Battle videos (no overlays today)
