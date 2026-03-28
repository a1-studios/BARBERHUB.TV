

# Fix Camera Studio: Recording Errors, Missing Mobile Buttons, Flip Camera

## Issues Identified

1. **Recording fails on save (iOS)**: `MediaRecorder` uses `video/webm` which iOS Safari does not support. Safari only supports `video/mp4` with H.264. The current code hardcodes `video/webm;codecs=vp9` with a fallback to `video/webm` — both fail on iOS.

2. **No REC button / flip button on mobile**: The bottom control bar renders 5 buttons (video, audio, REC, mode, flip) in a single row. The REC button is 56px, others are 48px. Total width with gaps: ~296px. This *should* fit on 390px, but the `pb-[env(safe-area-inset-bottom,16px)]` combined with the gradient overlay may be clipping. More likely: the `isActive` state never becomes `true` on mobile because the camera permission flow fails silently or the `Start Camera` overlay is not tappable behind the safe area inset.

3. **Flip camera not working**: The code calls `setSelectedCamera('')` + `setFacingMode(toggle)` which triggers the `useEffect` that calls `stopPreview(); startPreview()`. However `stopPreview` is synchronous but stream stop is async — `startPreview` may race with the old stream cleanup. Also, `stopPreview` calls `stopRecording()` which may reference stale state.

4. **WatchFeed**: The screenshots show platform promos and educator content rendering correctly in theater mode (not split-screen). This appears to be working as intended — only `type: "battle"` items with valid HTTP URLs render in SplitScreenBattle.

---

## Changes

### File: `src/pages/CameraStudio.tsx`

**Fix 1 — iOS MediaRecorder compatibility (lines 188-244)**
- Detect Safari/iOS: check if `MediaRecorder.isTypeSupported('video/mp4')` — Safari supports this
- Fall through: `video/mp4` → `video/webm;codecs=vp9` → `video/webm`
- Update the upload `contentType` and filename extension to match the selected MIME type
- In `handleRecordingComplete`, use the actual mimeType from the recorder

**Fix 2 — Mobile button visibility (lines 493-564)**
- Reduce button sizes from `h-12 w-12` to `h-10 w-10` for the 4 secondary buttons (video, audio, mode, flip)
- Keep the REC button at `h-14 w-14` as the primary action
- Reduce gap from `gap-3` to `gap-2` to ensure all 5 buttons fit within 390px minus padding
- Increase touch target with padding so it still meets the 48px minimum touch area

**Fix 3 — Flip camera race condition (lines 555-563)**
- Instead of relying on `useEffect` to detect state changes, call `stopPreview()` then `await startPreview()` directly in the click handler
- Remove `facingMode` from the `useEffect` dependency array (line 285) to prevent double-restart
- Add a guard `isFlipping` ref to prevent multiple rapid taps

**Fix 4 — Ensure recording works on all browsers**
- Add a `supportedMimeType` helper that returns the best available format
- Store the chosen mimeType in a ref so `handleRecordingComplete` uses the correct content-type for the R2 upload

### File: `src/pages/WatchFeed.tsx`
No changes needed — the feed already correctly separates battle content (split-screen) from video/educator/platform content (theater mode).

---

## Technical Detail

```text
MIME type detection order:
1. video/mp4           ← Safari/iOS
2. video/webm;codecs=vp9  ← Chrome/Firefox
3. video/webm          ← Fallback

Button layout at 390px:
Available: 390 - 32px (px-4) = 358px
Buttons: 40 + 40 + 56 + 40 + 40 = 216px
Gaps: 4 × 8px (gap-2) = 32px
Total: 248px ← comfortable fit
```

