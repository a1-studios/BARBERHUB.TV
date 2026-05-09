## Goal
Polish the /watch + Home hero feed: stop showing raw filenames, remember audio choice, eliminate the mobile top gap, hide empty/placeholder cards, and make playback feel snappy via Cloudflare Stream + smarter preloading.

---

## 1. Filename leaking as title (e.g. `f99cfb17-...mp4`)

**Root cause:** When uploads are saved, `title` is set to the original filename. `DynamicBattleHero` and `WatchFeed` then render `title` directly under the video, overriding the barber name.

**Files:**
- `src/components/DynamicBattleHero.tsx` lines ~149, 179, 203, 449
- `src/pages/WatchFeed.tsx` lines 112, 152, 179, 514

**Fix:** Add a small helper `cleanDisplayTitle(t)` in `src/lib/utils.ts` that returns `null` if the string:
- ends in a media extension (`.mp4|.mov|.webm|.m4v|.avi|.mkv|.jpg|.png`)
- is a UUID / contains `__` or hex-only blocks of 16+ chars
- equals the storage path basename

Use it everywhere `title` is rendered. `display_name` in the hero falls back to `barber_name` when the cleaned title is null. In WatchFeed only render the title `<p>` when `cleanDisplayTitle(item.title)` is truthy. The barber name continues to be the primary label.

---

## 2. Audio preference doesn't persist

**Files:** `src/pages/WatchFeed.tsx` (line 57), `src/components/DynamicBattleHero.tsx`, `src/components/battles/SplitScreenBattle.tsx` (mute toggles).

**Fix:** Create `src/hooks/usePersistedMute.ts` — a tiny hook backed by `localStorage['bh_feed_muted']` (default `true` to satisfy autoplay). Replace the local `useState(true)` mute states in the three components with this hook. Toggle writes back to storage so /watch, the hero, and split-screen all share one preference across navigations and reloads.

---

## 3. Mobile gap above the video on /watch

**Cause:** On iOS Safari the `fixed inset-0` container respects the dynamic toolbar; the actual issue is `h-screen` inside the scroller (line 541) using `100vh` instead of the visible viewport, plus no safe-area inset reset, which leaves a top band before the first item snaps.

**Fix in `src/pages/WatchFeed.tsx`:**
- Outer wrapper: `fixed inset-0 z-50 bg-black` + inline `style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top, 0)' }}` → switch padding to 0 because the back button already floats absolutely; we want the video flush.
- Each snap item: replace `h-screen` with `style={{ height: '100dvh' }}` so the first card fills the visible viewport with no gap.
- Move the floating back button to `top-2 left-2` and add `pointer-events-auto` so it doesn't push layout.

---

## 4. Don't render empty/placeholder cards

**Files:** `src/pages/WatchFeed.tsx` lines 254-292 (feed builder) and 479-491 (no-video fallback).

**Fix:**
- In the feed builder, remove the `Array.from({ length: 8 }, ...)` PLATFORM fill loop — only push real `allContent` items.
- In `renderVideoItem`, drop the `else` branch that renders a `<Play>` icon over a thumbnail. If neither `cloudflare_stream_uid` nor a usable `media_url` exists, return `null` so the parent skips that index.
- Pre-filter `allContent` to require `media_url?.startsWith('http')` AND a recognised video extension OR a `cloudflare_stream_uid`. Same filter applied to creator/creation/submission queries already; tighten the `profileVideos` query so missing `featured_video_id` rows are excluded (they already are via `.not(...is null)` but also reject thumbnail-only items).
- Remove the empty `AvatarFallback` `<User />` icon button when `creator_avatar` is missing AND `barber_user_id` is null — i.e. don't render the avatar action when there's no profile to link to.

---

## 5. Low-latency playback via Cloudflare Stream

**Current pain points:**
- Raw R2 `.mp4` URLs play in a plain `<video>` — no ABR, full file download before seek.
- Every feed item is mounted and starts buffering simultaneously.
- No `<link rel="preconnect">` to CF endpoints.

**Fixes:**

a) **Always prefer Cloudflare Stream UID.** In all four feed queries, also `select('cloudflare_stream_uid')` (already exists on `creations`, `battle_submissions`, `creator_content`, `barber_profiles`). Pass it through to feed items and let `CloudflareStreamPlayer` decide. The component already short-circuits to the adaptive HLS player when `streamUid` is set.

b) **Virtualise the video pool.** Only mount the player for `idx ∈ {activeIndex-1, activeIndex, activeIndex+1, activeIndex+2}`. For other indices render a lightweight thumbnail div (poster only). This drops simultaneous network connections from 20+ to 4, which is the main cause of the "laggy" first play.

c) **Smart preload hints.**
- Active index: `preload="auto"` and CF Stream `<Stream preload="auto">`.
- Neighbours: `preload="metadata"`.
- Others: not mounted.

d) **Connection warm-up in `index.html`:**
```html
<link rel="preconnect" href="https://customer-<accountHash>.cloudflarestream.com" crossorigin>
<link rel="preconnect" href="https://videodelivery.net" crossorigin>
<link rel="dns-prefetch" href="https://<r2-public-host>">
```
Read the host values from existing env / `R2_PUBLIC_URL` references; commit only the static known hosts.

e) **HLS for legacy R2 mp4s.** Where only an R2 URL exists (no UID yet), kick off a one-off ingest by calling the existing `livekit-egress-webhook` ingest helper pattern via a new tiny edge function `ingest-r2-to-stream` triggered lazily from the client when a video has been viewed but lacks a UID. Out of scope for this round if you'd rather keep it pure-frontend — flag for a follow-up.

f) **Drop autoplay on hidden items.** The current `useEffect` plays the active index, but unmounting via virtualisation makes this cheaper and removes the `video.play().catch(() => {})` thrash.

---

## Out of scope
- No DB schema changes, no RLS edits.
- No changes to upload pipeline (titles entered by users on creator-hub remain as-is — only the renderer filters bad ones).
- No new third-party players.

## Verification
1. Visit `/watch` on mobile preview → first card sits flush against the top, no gap.
2. Tap unmute → reload, navigate away and back → audio remains on.
3. Confirm no card shows a UUID/filename string under the barber name.
4. Confirm placeholder Play-icon cards no longer appear.
5. Network panel: only 3-4 video requests in flight at any time; CF Stream HLS used whenever `cloudflare_stream_uid` is present.
