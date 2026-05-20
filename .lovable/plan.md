## Goal

Make the WatchFeed strictly bandwidth-disciplined: only the **active** video downloads/plays, the **next** video warms up in the background, and **every other** video stays at `preload="none"` with no decoder attached.

Today the feed already virtualizes (only `activeIndex` and `activeIndex + 1` mount), but the "next" slot is treated identically to off-screen — it gets `preload="none"` and no src attachment until it becomes active. That's why the first frame after a swipe still takes ~1s. We need an explicit *prefetch* state between "idle" and "playing".

---

## Changes

### 1. `src/components/video/SmartVideoPlayer.tsx`

Add a new prop:

```ts
preloadMode?: 'none' | 'metadata' | 'auto';  // default 'none'
```

Behavior matrix (replaces the current binary `shouldPlay` gate):

| State | src attached | hls.js attached | `<video preload>` | playing |
|---|---|---|---|---|
| Active (`shouldPlay`) | yes | yes | `metadata` | yes |
| Preload next (`preloadMode !== 'none'` && !shouldPlay) | yes | yes, **but `autoStartLoad: false`** then `hls.startLoad(-1)` capped to lowest level | `auto` or `metadata` per prop | **no** (never call `v.play()`) |
| Idle | no | no | `none` | no |

Implementation notes:
- Split the current "attach source" effect so it triggers when `shouldPlay || preloadMode !== 'none'`.
- When prefetching, instantiate hls with `autoStartLoad: false, startLevel: 0`, then call `hls.startLoad()` so it fetches the manifest + first segment only. Do **not** call `v.play()`.
- When `shouldPlay` flips true on a prefetched player, the manifest + first segment are already cached → instant first frame.
- When both `shouldPlay` and `preloadMode` are false, run the existing teardown (`pause`, `removeAttribute('src')`, `load()`, destroy hls).
- The `<video preload>` attribute becomes: `shouldPlay ? 'metadata' : preloadMode`.

### 2. `src/pages/WatchFeed.tsx`

In `renderVideoItem` (line 486):

- Keep the virtualization window but widen by one: `shouldMount = idx === activeIndex || idx === activeIndex + 1` (already effectively the case — make it explicit and drop the `idx >= activeIndex` constraint so a quick scroll-back still has the previous frame warm; optional, can keep current rule).
- Pass new prop to `SmartVideoPlayer`:
  ```tsx
  preloadMode={isActive ? 'metadata' : idx === activeIndex + 1 ? 'auto' : 'none'}
  ```
- Active stays `forceActive={isActive}` (drives playback). Next neighbour gets `forceActive={false}` + `preloadMode="auto"` → warms the pipe without playing.

### 3. No other component changes

`SplitScreenBattle`, `BrandedVideoPlayer`, `CloudflareStreamPlayer`, `VideoPlayer` are not part of the WatchFeed pipeline and stay as-is.

---

## Expected impact

- Active video: identical to today (instant, lowest rendition first).
- Next video: manifest + ~2-4s of segment 0 already in browser cache by the time the user swipes → first-frame on swipe drops from ~800-1200ms to ~100-200ms.
- Off-screen videos: zero bytes, zero decoders (unchanged — already enforced by virtualization, now also explicit via `preload="none"`).
- Peak concurrent decoders: still 1 (only the active player calls `play()`).

---

## Out of scope

- No DB/RPC, no auth/economy changes.
- No changes to LiveKit / live PK path.
- No changes to BrandedVideoPlayer or the legacy `VideoPlayer`.
- Cloudflare Page Rule / CORS already verified in prior turns.
