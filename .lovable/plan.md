

## Issues from screenshot + complaints

1. **Mobile video layout (VOD/voting phase)** — `BattleTheater.tsx` line 366 uses `<div className="h-full flex">` which forces side-by-side on ALL viewports (cramped on mobile). Needs `flex-col md:flex-row` like we did in `LiveKitArena`.

2. **Vote buttons wrong colors** — `BattleTheater.tsx` lines 394 (`from-blue-500 to-blue-600`) + 434 (`from-purple-500 to-purple-600`). Replace with brand: **orange** for left + **cyan** for right.

3. **Like (floating reaction) emojis too big and hang around too long** — `FloatingReactions.tsx`: `text-4xl` + 3s `duration` + 3s removal timeout → shrink to `text-2xl` and reduce duration to `1.8s` so they fade fast.

4. **Live pill hangs after broadcast ends** — Right now the pill auto-refetches every 5s + listens to `barber_profiles`/`battles` realtime. The hang happens because:
   - Solo broadcasts: `is_live` flag may stay `true` after end (no end-broadcast cleanup writes it false), only `last_live_check` ages out — and our 30-second `LIVE_BROADCAST_STALE_MS` means up to 30s lag.
   - Battles: 2-min freshness window is way too generous for "immediately disappear."
   
   Fix:
   - Tighten battle window from **2 min → 30 seconds** (LiveKit heartbeats every 10s, so 30s is comfortably "live now").
   - Tighten `LIVE_BROADCAST_STALE_MS` from 30s → 15s for solo broadcasts in `liveBroadcast.ts`.
   - On Realtime UPDATE for `battles`, immediately drop the item from local state if either `barber*_is_streaming` flips to false OR `status` leaves the active set — don't wait for next refetch.

5. **Viewers can't see the two barbers in VOD phase** — The two video tiles show "No video available" because `barber_1_video_url` / `barber_2_video_url` are null. This is a data issue, not a viewer-logic bug — the egress hasn't populated VOD URLs, OR the battle skipped processing. Already-existing fallback (`battleStreamUid → CloudflareStreamPlayer`) handles the combined egress recording (single Cloudflare Stream UID for the whole battle), but it's only used when `cloudflare_stream_uid` exists. When neither exists → "No video available" shows for both. 
   
   Fix: when no VOD content exists yet, instead of two empty players, show ONE friendly "Recording is being processed — check back soon" placeholder spanning the full split, and auto-redirect/refetch on `cloudflare_stream_uid` arrival via realtime (already subscribed). This makes the viewer experience correct.

## Files Touched

| File | Change |
|---|---|
| `src/pages/BattleTheater.tsx` | (a) Split container `h-full flex` → `h-full flex flex-col md:flex-row`, give each side `h-1/2 md:h-full`. (b) Vote button left: orange gradient (`from-orange-500 to-orange-600`). Right: cyan gradient (`from-cyan-500 to-cyan-600`). (c) When both videos are missing AND no `cloudflare_stream_uid`, render single "Recording in progress" placeholder full-bleed instead of two empty players |
| `src/components/battles/FloatingReactions.tsx` | Emoji size `text-4xl` → `text-2xl`; animation `duration: 3` → `1.8`; removal timeout `3000` → `1800` |
| `src/components/battles/LiveActivityPill.tsx` | Battle freshness window 2min → 30s; on realtime UPDATE explicitly remove from list if `is_streaming` flips false or `status` leaves active set (immediate UI clear, no wait for refetch) |
| `src/lib/liveBroadcast.ts` | `LIVE_BROADCAST_STALE_MS` 30000 → 15000 |
| New migration | UPDATE `barber_profiles SET is_live = false` where `last_live_check < now() - 30 sec` AND is_live = true (purges current ghost solo entries); also re-run battle ghost cleanup with 30s window |

## Result
- Mobile VOD viewer: barber 1 fills top half, barber 2 fills bottom half → much larger and readable.
- Vote buttons in signature **orange + cyan** instead of blue/purple.
- Floating reaction emojis are smaller, snappier — disappear in under 2 seconds.
- Live activity pill clears within seconds (not minutes) of any stream ending; ghost rows wiped immediately.
- When no VOD asset is ready, viewers see a single clear "Recording in progress" instead of two confusing empty players.

