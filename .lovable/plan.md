# Why the Watch page buffers (other pages don't)

Other pages use `SmartVideoPlayer` with a single, always-active video — no prefetch, no swapping, no mid-feed sponsor/battle slots. The Watch page is the only place that:

1. Mounts an *active* player **and** a *prefetch* player at the same time,
2. Flips a mounted player from prefetch → active mid-life, and
3. Interleaves sponsor cards and split-screen battles into the vertical feed.

Three real bugs fall out of that. None of them exist on the other pages, which is exactly why those load fine.

---

## Bug 1 — Prefetched HLS instance is destroyed the moment it becomes active

`SmartVideoPlayer.tsx`, the source-attach effect:

```ts
useEffect(() => {
  ...
  return () => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    try { v.removeAttribute('src'); v.load(); } catch {}
  };
}, [src, isHls, shouldAttach, shouldPlay]);
```

`shouldPlay` is in the deps. So when the user swipes and a prefetched player flips from `shouldPlay=false → true`, the cleanup runs first → `hls.destroy()` + `v.removeAttribute('src')` + `v.load()` → all the manifest + first-segment work we just paid for is thrown away. Then the effect re-runs and builds a brand new HLS from scratch. That's the ~800–1500 ms hitch users feel after every swipe.

**Fix:** split the effect.
- Effect A (deps: `src, isHls, shouldAttach`) — owns lifecycle: creates HLS / attaches `src` when `shouldAttach` becomes true, tears it down only when `shouldAttach` becomes false. This effect must **not** depend on `shouldPlay`.
- Effect B (deps: `shouldPlay`) — only reconfigures the existing instance: when going prefetch → active, raise hls.js buffer caps (`maxBufferLength: 30`, `maxMaxBufferLength: 60`, `backBufferLength: 10`) via `hls.config.* = …` and call `hls.startLoad()` if not already loading. No destroy.

Result: the prefetched manifest + segment 0 stays in the hls.js buffer; activation just unpauses the loader and calls `v.play()`.

## Bug 2 — Sponsor / battle slots eat the "preload next" budget

`WatchFeed.tsx` line 521:

```tsx
preloadMode={isActive ? 'metadata' : idx === activeIndex + 1 ? 'auto' : 'none'}
```

The feed builder (lines 322, 335) injects a sponsor every 3 items and a battle every 6 items. So a meaningful fraction of the time `feed[activeIndex + 1]` is **a sponsor card or a SplitScreenBattle**, neither of which prefetches anything. The next real video is at `activeIndex + 2` or `+3` and gets `preloadMode='none'` — so the swipe lands on a cold player and stalls.

**Fix:** in `renderVideoItem`, compute the prefetch target dynamically:

- Find the index of the next item in `feed` after `activeIndex` whose `type` is `'video'` / `'educator'` / `'platform'` (i.e. anything routed through `SmartVideoPlayer`). Call it `nextVideoIdx`.
- Memoize it once per `activeIndex` change (cheap O(n) scan over a small window — `feed` is < ~60 items).
- Pass `preloadMode={isActive ? 'auto' : idx === nextVideoIdx ? 'auto' : 'none'}`.
- Widen the mount window to `idx === activeIndex || idx === nextVideoIdx` (keep the existing `idx >= activeIndex` rule, since scroll-back currently remounts and that's intentional).

Also: `SplitScreenBattle` should warm its two videos when it is the next slot. Add `isPreloading` prop (default false). When `isPreloading && !isActive`, set `src` on both videos with `preload="metadata"` (no `play()`). Existing `isActive` behaviour unchanged. WatchFeed sets `isPreloading={idx === nextVideoIdx}`.

## Bug 3 — Active player is bandwidth-starved

Two settings work against the active player specifically:

a) `<video preload={shouldPlay ? 'metadata' : preloadMode}>` — when active, the attribute is `'metadata'`. For MP4 fallbacks (R2 direct URLs that aren't Cloudflare Stream), this caps how much the browser will buffer ahead. Change active to `'auto'`.

b) HLS active config caps buffer hard:

```ts
maxBufferLength: prefetchOnly ? 4 : 12,
maxMaxBufferLength: prefetchOnly ? 6 : 24,
backBufferLength: prefetchOnly ? 0 : 8,
```

12 s of forward buffer is tight for VOD on flaky mobile — default hls.js is 30/60. Raise active values to `maxBufferLength: 30, maxMaxBufferLength: 60, backBufferLength: 10`. Prefetch values stay tiny (4/6/0).

Also drop `testBandwidth: !prefetchOnly` for the active path and keep `startLevel: 0` only for the very first segment, then let `capLevelToPlayerSize` + `capLevelOnFPSDrop` take over (they already are).

---

## Out of scope

- No changes to the feed queries, DB, or `SmartVideoPlayer` public API beyond the new `preloadMode` behaviour and the split effects.
- No changes to LiveKit, BrandedVideoPlayer, CloudflareStreamPlayer, or other pages.
- No Cloudflare-side changes (Stream + R2 already verified).

## Expected impact

- Swipe → first-frame on the Watch page drops from ~800–1500 ms to ~100–250 ms (prefetched HLS survives activation, and the prefetch always points at the *actual next video*, not a sponsor card).
- Mid-playback rebuffer events on weak mobile drop because the active forward buffer goes from 12 s to 30 s.
- Off-screen players still hold zero decoders and zero bytes — peak concurrent decoders stays at 1.

## Files to change

- `src/components/video/SmartVideoPlayer.tsx` — split effects, raise active buffer caps, set active `<video preload>` to `'auto'`.
- `src/pages/WatchFeed.tsx` — compute `nextVideoIdx`, use it for both mount window and `preloadMode`.
- `src/components/battles/SplitScreenBattle.tsx` — add optional `isPreloading` prop, warm both `<video>` elements without playing when set.
