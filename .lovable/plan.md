

## Fix Video Zoom on Desktop + Play-Once Behavior

### Changes: `src/pages/WatchFeed.tsx`

**1. Fix desktop zoom** — Change `object-cover` to `object-contain` on the `<video>` element (line 191). This prevents the video from being cropped/zoomed on wider screens while still filling the black background.

**2. Play once, then show replay button** — Remove the `loop` attribute from `<video>`. Add state tracking (`endedVideos`) to know which videos have finished. On the `onEnded` event, mark the video as ended. When ended, overlay a centered Play button. Clicking it replays the video.

### Implementation details

- Add `const [endedVideos, setEndedVideos] = useState<Set<string>>(new Set())` to track which feed items have finished playing
- Add `videoRefs` map (`useRef<Map<string, HTMLVideoElement>>`) to access video elements for replay
- On the `<video>`: remove `loop`, add `onEnded` handler that adds `item.id` to `endedVideos`
- When `endedVideos.has(item.id)`, render a semi-transparent overlay with a Play button that calls `videoRef.currentTime = 0; videoRef.play()` and removes the item from `endedVideos`
- Change `object-cover` → `object-contain` on the video element

