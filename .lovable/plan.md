

# Fix Camera Studio Upload + Add WatchFeed Unmute Button

## 1. Fix upload field name mismatch
**File: `src/pages/CameraStudio.tsx`** (lines 236-239)

The edge function `get-r2-presigned-url` expects `{ key, contentType }` and returns `{ uploadUrl }`.
The Camera Studio sends `{ filename, contentType, action }` and reads `urlData.url`.

Fix:
- Change `body: { filename, contentType, action: 'PUT' }` → `body: { key: filename, contentType }`
- Change `urlData.url` → `urlData.uploadUrl`

## 2. Add unmute/mute toggle to WatchFeed
**File: `src/pages/WatchFeed.tsx`**

- Add `Volume2` and `VolumeX` to lucide imports
- Add `isMuted` state (default `true` — browsers require muted autoplay)
- Add a translucent circular mute/unmute button in the bottom-right corner of the screen (above the gradient overlay)
- When toggled, update the `muted` property on the active video element via `videoRefs`
- Style: same glass pill as the back button (`bg-black/30 backdrop-blur-sm border border-white/10`)

## Files to modify

| File | What |
|------|------|
| `src/pages/CameraStudio.tsx` | Fix `filename` → `key`, `.url` → `.uploadUrl` (2 lines) |
| `src/pages/WatchFeed.tsx` | Add mute/unmute toggle button + state |

