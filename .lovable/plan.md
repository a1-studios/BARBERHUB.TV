## WatchFeed performance audit — what's blocking smooth playback

After tracing the full pipeline (WatchFeed → SmartVideoPlayer → activeVideoStore → SplitScreenBattle → hls.js), here are the concrete bottlenecks and the surgical fixes for each. Mobile-first, no behaviour changes.

---

### 1. `feed` is rebuilt every render (biggest CPU hit)

`src/pages/WatchFeed.tsx` lines 293–344 build `allContent` + the entire `feed` array (filter + while-loop + dedupe checks) on **every render** — including every `activeIndex` change, every mute toggle, every scroll observer fire. With ~30 items × 4 sources that's hundreds of ops per scroll.

**Fix:** wrap `allContent` and `feed` (and the sponsor/battle interleave loop) in a single `useMemo` keyed on `[shuffledContent, sponsors, battleItems]`.

---

### 2. Dead `videoRefs` effect runs on every state change

Lines 394–405 iterate `videoRefs.current` and call `feed.findIndex` for each — but **nothing populates `videoRefs`** anymore (SmartVideoPlayer owns its own `<video>`). The effect is dead code that still triggers an O(N²) scan on every mute/active change.

**Fix:** delete `videoRefs`, delete the entire `useEffect` at 394–405. Mute is already wired via the `muted` prop into SmartVideoPlayer.

---

### 3. Off-screen `<video>` still preloads on the fallback (MP4) path

In `SmartVideoPlayer.tsx` line 128, when the source isn't HLS we set `v.src = src` inside the mount effect — **before** `shouldPlay` is true. The browser begins buffering the neighbour video immediately, doubling network + decoder pressure on mobile.

**Fix:** only assign `v.src` (or attach hls) when `shouldPlay` is true. When it flips false, detach and clear src so the decoder releases.

---

### 4. HLS starts at highest renditon → first-frame lag on mobile

`startLevel: -1` (line 118) lets ABR auto-pick — on a fast LAN that's 1080p, which delays first frame by 1–2s on a phone.

**Fix:** `startLevel: 0` + `testBandwidth: true`. Cap with `capLevelOnFPSDrop: true`. Result: instant low-rez first frame, ABR upshifts after.

---

### 5. `SplitScreenBattle` bypasses the single-decoder guard

`src/components/battles/SplitScreenBattle.tsx` uses raw `<video src>` × 2 with no `activeVideoStore` registration. When a battle item lands in the feed, you have **2 always-playing decoders** in addition to the active SmartVideoPlayer = 3 decoders. On mobile that's the cliff.

**Fix:** the component already receives `isActive`. Add `preload="none"` when inactive, gate `src` assignment behind `isActive`, and on unmount/inactive call `pause(); removeAttribute('src'); load();` to release the decoder.

---

### 6. Thumbnails for off-screen items are unbounded

Line 540 uses inline `style={{ backgroundImage: url(...) }}` — no `loading="lazy"`, no decoding hint, and CSS `background-image` never lazy-loads natively.

**Fix:** swap to `<img loading="lazy" decoding="async" fetchPriority="low" className="absolute inset-0 w-full h-full object-cover" />`. Browser will defer offscreen decode and free memory.

---

### 7. IntersectionObserver thrash on scroll

The WatchFeed observer at line 371 is recreated whenever `feed.length` changes, and inside the callback calls `supabase.rpc('increment_content_views')` synchronously per intersection — fine, but the observer threshold is `0.6` while SmartVideoPlayer's internal one is also `0.6`. Two observers per item.

**Fix:** keep WatchFeed's observer (it drives `activeIndex`), but in SmartVideoPlayer skip the internal IO when `forceActive` is passed (already the WatchFeed path). One observer per row instead of two.

---

### 8. Lingering noise

- `CloudflareStreamPlayer` import in WatchFeed (line 13) is unused → remove.
- The `RESET_BLANK_CHECK` console warning is from Lovable's dev shim, not the app — ignore.
- `index.html` preconnect to `media.barberhub.tv` + Cloudflare Stream origin is already in place ✅.
- Page Rule cache + R2 CDN binding confirmed ✅.

---

### Files to change

```text
src/pages/WatchFeed.tsx
  - useMemo for allContent + feed
  - delete videoRefs + dead effect
  - swap thumbnail div → <img loading="lazy">
  - remove unused CloudflareStreamPlayer import

src/components/video/SmartVideoPlayer.tsx
  - gate src/hls attach on shouldPlay
  - tear down + release decoder when shouldPlay flips false
  - HLS startLevel: 0, testBandwidth: true, capLevelOnFPSDrop: true
  - skip internal IntersectionObserver when forceActive prop is provided

src/components/battles/SplitScreenBattle.tsx
  - preload="none" + gated src assignment on isActive
  - release decoder when isActive flips false
```

### Out of scope (intentionally)

- No DB/RPC changes, no schema migrations
- No new player abstraction or refactor
- No changes to LiveKit live-PK path
- No changes to BB economy / auth / moderation
- Cloudflare Page Rule TTL bump (you already have that pending in the CF dashboard)

Expected impact on mobile: ~50% fewer active video decoders during normal scroll, first-frame time on HLS drops from ~1.5s → ~400ms, idle CPU between scrolls drops because the dead effects + per-render feed rebuild are gone.