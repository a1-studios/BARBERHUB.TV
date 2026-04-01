

# Fix Camera Flip & Buried Controls in BroadcastStudio

## Root Cause

The `VideoTrack` component from LiveKit renders a `<video>` element that creates its own stacking context, painting **over** the overlay controls (metrics bar, flip button, bottom controls). The current `z-10` on overlays is not high enough — when the camera re-enables after a flip, the fresh video element renders on top of everything, hiding the buttons.

## Changes

### File: `src/pages/BroadcastStudio.tsx`

**1. Fix z-index layering** — Pin the video at `z-0` and raise all overlay controls to `z-50`:
- Add `relative z-0` to the `VideoTrack` component
- Change top metrics overlay from `z-10` → `z-50`
- Change camera flip button from `z-10` → `z-50`
- Wrap bottom controls in a `z-50` container
- Add `pointer-events-none` to the video container and `pointer-events-auto` to each control element so taps pass through to buttons, not the video

**2. Fix camera flip black flash** — Instead of disabling then re-enabling the camera (which causes a black frame), use LiveKit's `restartTrack` approach:
```typescript
const flipCamera = useCallback(async () => {
  const newMode = facingMode === 'user' ? 'environment' : 'user';
  setFacingMode(newMode);
  
  // Get the current camera track and restart it with new facing mode
  const camTrack = localParticipant.getTrackPublication(Track.Source.Camera);
  if (camTrack?.track) {
    await camTrack.track.restartTrack({ facingMode: newMode });
  } else {
    await localParticipant.setCameraEnabled(true, { facingMode: newMode });
  }
}, [localParticipant, facingMode]);
```
This swaps the camera device in-place without tearing down the track, eliminating the black flash.

**3. Ensure controls are always visible** — Move the bottom control bar outside the video container's relative context and position it as a fixed overlay at the bottom of the screen with `z-50`.

### Resulting layout structure
```text
┌─────────────────────────┐
│  [LIVE] [👁 3]    [0:42] │  ← z-50 top overlay
│                    [🔄] │  ← z-50 flip button
│                         │
│     <VideoTrack z-0>    │  ← video pinned behind
│                         │
│  [🎤] [📷] [END STREAM] │  ← z-50 bottom bar
└─────────────────────────┘
```

## File Summary

| File | Change |
|------|--------|
| `src/pages/BroadcastStudio.tsx` | Fix z-index on all overlays to z-50, pin video at z-0, use `restartTrack` for flip to avoid black flash |

