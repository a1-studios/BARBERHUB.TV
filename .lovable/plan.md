## Manual play button + bottom-left replay icon

### 1. `SmartVideoPlayer.tsx` — add `manualPlayback` prop

When `manualPlayback={true}`:
- Skip the auto play-attempt effect entirely (no `tryPlay()` on mount).
- Always render the centered Play button while the video is paused and not ended (independent of `autoplayBlocked` / `loading`).
- Tapping the Play button or the surface starts the video; tapping again pauses.
- Replay behavior unchanged.

This is the missing "true manual" mode — current `showCenterPlayButton` still forces a play attempt first via `shouldPlay`, which is why portfolio videos appear stuck.

### 2. Portfolio video modals — use manual mode

Files: `src/pages/BarberPublicProfile.tsx`, `src/components/profiles/PortfolioManager.tsx`

In the `<Dialog>` `SmartVideoPlayer`:
- Remove `autoPlayWhenVisible`, `loop`, `forceActive`.
- Add `manualPlayback`.
- Keep `controls`, `tapToToggle`, `showCenterPlayButton`, `muted={false}`, `className="w-full h-full"`, `aspect-[9/16]` container.

Result: opening the dialog shows a poster + centered orange Play button. One tap plays. One tap pauses. Video ends → poster returns with Play (no auto-loop).

### 3. Watch feed — small replay icon at bottom-left

File: `src/pages/WatchFeed.tsx`

- Track per-item ended state via existing `handleVideoEnded(idx)`. Add `endedIndex` state (or reuse an existing one) and set it when the active card ends; clear on swipe.
- Pass `enableReplay={false}` to the active `SmartVideoPlayer` so the big centered replay overlay no longer renders.
- Render a small icon button (`RotateCcw` from lucide-react, ~h-9 w-9 rounded-full bg-black/50 backdrop-blur, primary text) at `absolute bottom-20 left-3 z-20` on the active card whenever `endedIndex === idx`. Click → calls a new replay handler that finds the video element and replays it.
- Simplest replay trigger: clear `endedIndex` and use a `replayNonce` state that bumps; pass it into a small wrapper effect — or expose imperative replay through a ref on `SmartVideoPlayer` via a new optional `replayTrigger?: number` prop that, when changed, resets ended + plays from 0.

Cleanest implementation: add `replayTrigger?: number` prop to `SmartVideoPlayer` that runs the existing `handleReplay` logic whenever it changes. Then WatchFeed bumps it on icon click.

### Out of scope
- `.mov` deep-link codec support (browser-level limitation; separate problem).
- Hero → Watch routing already prepends the synthetic pinned item; no changes needed here.