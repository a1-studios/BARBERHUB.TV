

## Fix Camera, Full-Screen Viewfinder, and Restore SOS/House Call Buttons

### Problems Identified

1. **Camera not working**: The `startCamera` function gets the stream and tries to attach it to `videoRef.current`, but `videoRef` only exists in the DOM when `showCamera` is true. Since `setShowCamera(true)` is called *after* getting the stream (same function), the video element doesn't exist yet when we try to assign `srcObject`. The camera flip also uses `setTimeout(startCamera, 100)` which breaks the browser's user-gesture chain.

2. **Camera viewfinder too small**: Currently constrained to `aspect-square max-h-[280px]` — needs to fill the entire dialog real estate.

3. **SOS / House Call hidden**: Currently behind a "More options" expand. User wants them always visible.

### Changes

#### 1. Fix camera in `StyleCaptureButton.tsx`

- Split the flow: on click, set `showCamera = true` first, then use a `useEffect` watching `showCamera` + `facingMode` to call `getUserMedia` and attach the stream to the video ref once it's mounted.
- **But** this breaks the user-gesture requirement. Instead: call `getUserMedia` directly in the click handler, store the stream in `streamRef`, set `showCamera = true`, then use a `useEffect` to attach `streamRef.current` to `videoRef.current` once mounted.
- For camera flip: stop tracks, toggle facingMode state, and let the `useEffect` re-acquire with the new facingMode — no `setTimeout`.

#### 2. Full-screen viewfinder in `StyleCaptureButton.tsx`

- Change the camera view from `aspect-square max-h-[280px]` to a fixed overlay using `fixed inset-0 z-50 bg-black` so it covers the full screen (not just the dialog). This gives maximum real estate for framing.
- Shutter button, close, and flip controls overlaid at the bottom.

#### 3. Restore SOS / House Call in `BookingConsole.tsx`

- Remove the `showMoreOptions` state and the collapsible toggle.
- Always render the SOS and House Call buttons below the Book button (or above the total section) as a visible row.

### Files Changed

| File | Change |
|------|--------|
| `src/components/booking/StyleCaptureButton.tsx` | Fix camera stream attachment via useEffect, full-screen viewfinder overlay, fix camera flip without setTimeout |
| `src/components/booking/BookingConsole.tsx` | Always show SOS Cut and House Call buttons, remove "More options" toggle |

