## Video Playback Audit — Root Causes

I traced every playback path (WatchFeed, battles, profiles, theater, academy) through `SmartVideoPlayer`, `CloudflareStreamPlayer`, `HLSVideoPlayer`, `BrandedVideoPlayer`, and the raw `<video>` in `VideoPlayer.tsx`. Five concrete issues are causing the lag and slow first-frame.

### 1. R2 origin URLs are hitting the bucket directly (no CDN)
- `creations.media_url`, `creator_content.media_url`, `battle_submissions.media_url`, `featured_video_id` are stored as raw `*.r2.cloudflarestorage.com` URLs and passed straight into `<video src>`.
- The earlier instruction was: **GETs must route through `https://media.barberhub.tv`** (Cloudflare CDN in front of R2). That rewrite was never implemented — `rg "media.barberhub.tv"` returns zero hits in `src/`.
- Result: every playback is a cold origin pull with no edge cache, no HTTP/2 multiplexing tuned for media, no Range optimization → multi-second TTFB and stalling on seek.

### 2. Two parallel player stacks exist and fight each other
- `SmartVideoPlayer` (new, has `activeVideoStore` single-decoder guard) is used in `WatchFeed`.
- `CloudflareStreamPlayer`, `HLSVideoPlayer`, `BrandedVideoPlayer`, `VideoPlayer` are still used in `BattleTheater`, `BarberPublicProfile`, `PortfolioManager`, `CourseDetailDrawer`, `BarberVideoSection`, `SubmissionPreview`, `BattleResultsView`, `FullscreenBattleVideoModal`, `BattleVotingView`. None of them register with `activeVideoStore`, so when the user navigates between feed and a battle page, **multiple decoders stay alive** and continue to download.
- `VideoPlayer.tsx` and `HLSVideoPlayer.tsx` native branches have no IntersectionObserver — they autoplay unconditionally with `controls` enabled and `preload="metadata"`, racking up parallel HLS/MP4 fetches.

### 3. WatchFeed mounts up to 3 SmartVideoPlayers (distance ≤ 2)
- In `renderVideoItem`: `shouldMount = distance <= 2` → previous + current + next + next-next = up to 5 mounted `<video>` elements per scroll position (often 3 visible + 2 buffered). With Cloudflare Stream's `<Stream>` component each one constructs its own HLS player, even though only one is `forceActive`.
- The "single-decoder guard" only suppresses **play()**, not **bandwidth**. The off-screen Stream iframes still negotiate the manifest + segment 0.

### 4. Cloudflare Stream `<Stream>` is iframe-based and heavy
- Every `streamUid` mount spins up a same-origin iframe with its own JS runtime. On mobile (390px viewport), 3 of those = significant memory + main-thread cost. We can use the lighter `hls.js` direct path against `https://customer-<code>.cloudflarestream.com/<uid>/manifest/video.m3u8` for VOD and reserve the iframe player for live.

### 5. `loading` state never resets between items + autoplay race
- `SmartVideoPlayer` defaults `loading=true` and only clears on `onLoadedData`/`onPlaying`. On the iframe Stream path, when the player is mounted but not active (`shouldPlay=false`), `onLoadedData` may not fire → the spinner spins forever behind the active card, costing GPU.
- `tryPlay` waits on `loadeddata` but never times out; on a slow R2 fetch (issue #1) it keeps a pending promise per scroll, compounding pressure.

---

## Fix Plan (frontend-only, no DB changes)

### A. Add a CDN rewrite helper and apply it at read time
- New `src/lib/mediaCdn.ts` exporting `toCdnUrl(url)` that rewrites any `*.r2.cloudflarestorage.com` (and the public `pub-*.r2.dev` form) host to `media.barberhub.tv`, preserving the path + query. Idempotent; leaves non-R2 URLs untouched.
- Wrap `media_url`, `thumbnail_url`, and `featured_video_id` in **read paths only**:
  - `src/pages/WatchFeed.tsx` (all 4 queries)
  - `src/pages/BarberPublicProfile.tsx`, `src/components/barber/BarberVideoSection.tsx`, `src/components/profiles/PortfolioManager.tsx`, `src/components/battles/SubmissionPreview.tsx`, `src/components/battles/BattleResultsView.tsx`, `src/components/battles/FullscreenBattleVideoModal.tsx`, `src/components/battles/BattleVotingView.tsx`, `src/pages/BattleTheater.tsx`, `src/components/academy/CourseDetailDrawer.tsx`.
- Upload paths (`CreationUpload`, multipart) keep hitting R2 directly — unchanged.

### B. Make every player respect the single-decoder store
- Refactor `BrandedVideoPlayer`, `HLSVideoPlayer`, and the inner `<video>` in `VideoPlayer.tsx` to delegate to `SmartVideoPlayer` (keep their props as a thin wrapper).
- Replace direct uses of `CloudflareStreamPlayer` in non-live contexts with `SmartVideoPlayer`. Live (BattleTheater LiveKit / live HLS) keeps the iframe Stream since those need adaptive low-latency.

### C. Reduce WatchFeed mount window + cheaper neighbors
- Change `shouldMount = distance <= 2` → `distance <= 1` (current + next only). Previous item already played; remount on scroll-back is cheap and saves a decoder.
- Render `thumbnail_url` (`<img loading="lazy" decoding="async">`) for non-active neighbors instead of `background-image` so the browser can drop them when off-screen.

### D. Prefer `hls.js` direct HLS for VOD instead of the Stream iframe
- In `SmartVideoPlayer`, when `streamUid` is present and `forceActive`/visible, mount a single `<video>` + dynamically-imported `hls.js` pointed at `https://customer-<CF_STREAM_CUSTOMER>.cloudflarestream.com/${streamUid}/manifest/video.m3u8`. Fall back to the `<Stream>` iframe only when `hls.js` cannot run (Safari uses native HLS).
- Adds `VITE_CF_STREAM_CUSTOMER_CODE` env var (read from `.env`).

### E. Tighten the loading/play lifecycle
- Reset `loading` to `true` only when `src`/`streamUid` changes, not on every render.
- Add a 4s safety timeout in the `tryPlay` `loadeddata` await: if it doesn't fire, abort and surface a "Tap to play" affordance (avoids leaked pending promises).
- Set `preload="none"` on non-active SmartVideoPlayer instances (currently `'metadata'`).

### F. Quick wins
- Add `<link rel="preconnect" href="https://media.barberhub.tv" crossorigin>` and `https://customer-<code>.cloudflarestream.com` to `index.html`.
- Add `Cache-Control: public, max-age=31536000, immutable` expectations doc in `.lovable/plan.md` for the Cloudflare Worker fronting `media.barberhub.tv` (worker config itself is outside this repo).

---

## Out of Scope
- Database/RPC changes, schema migrations, transcoding pipeline, LiveKit live-PK code, BB economy/auth/moderation.
- Authoring/upload paths (still direct R2 multipart).
- The actual Cloudflare Worker / DNS for `media.barberhub.tv` (handled on the Cloudflare side; we only consume it).

---

## Files Touched (estimate)
- **New**: `src/lib/mediaCdn.ts`
- **Edit**: `src/components/video/SmartVideoPlayer.tsx`, `src/components/BrandedVideoPlayer.tsx`, `src/components/VideoPlayer.tsx`, `src/components/battles/HLSVideoPlayer.tsx`, `src/components/CloudflareStreamPlayer.tsx`, `src/pages/WatchFeed.tsx`, `src/pages/BattleTheater.tsx`, `src/pages/BarberPublicProfile.tsx`, `src/components/barber/BarberVideoSection.tsx`, `src/components/profiles/PortfolioManager.tsx`, `src/components/battles/SubmissionPreview.tsx`, `src/components/battles/BattleResultsView.tsx`, `src/components/battles/FullscreenBattleVideoModal.tsx`, `src/components/battles/BattleVotingView.tsx`, `src/components/academy/CourseDetailDrawer.tsx`, `index.html`, `.env` (add `VITE_CF_STREAM_CUSTOMER_CODE`).
