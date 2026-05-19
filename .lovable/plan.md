## Problem

Text overlays disappear on Publish because they only commit to the parent when the user explicitly taps **Done** inside the Edit panel. If the user:

- closes the Edit sheet via the **X** button, or
- dismisses it by tapping outside / swiping down,

`onCommit(draft)` is never called, so `edit.textOverlays` in `RecordingReviewSheet` stays `[]`. When Publish fires, `overlayPayload.overlays` is empty and nothing is saved.

(The DB column `overlay_payload` already exists on both `creations` and `creator_content`, and `CameraStudio.uploadRecording` already writes it — the data is just missing by the time Publish runs.)

## Fix

### 1. `src/components/camera/EditPanel.tsx`
Make every exit path commit the current draft so edits are never silently dropped:

- Wrap dismissal in a single `commitAndClose()` that calls `onCommit(draft)` then `onClose()`.
- Use it for:
  - `<Sheet onOpenChange>` when `v === false`
  - The top-left **X** button
  - The **Done** button (already commits — keep behavior)
- Keep the `useEffect` that reseeds `draft` from `state` when `open` flips true, so re-opens reflect any external edits.

### 2. `src/components/camera/RecordingReviewSheet.tsx`
Add a small safety net so live overlays in the preview always match what will be published:

- Pass an `onLiveChange` callback (optional) — not required if Step 1 lands, but include it: whenever EditPanel's text tab changes overlays, propagate immediately (`setEdit((e) => ({ ...e, textOverlays }))`). This makes the bottom preview reflect in‑progress edits and removes any remaining commit‑timing risk.

### 3. Verification
- Open camera studio → record → Edit → add text → close with **X** → tap **Publish** → confirm `overlay_payload.overlays` is non‑empty (toast + Supabase row on `creations` / `creator_content`).
- Repeat closing via swipe‑down and via Done.
- Confirm the `[overlay] received payload …` log in `upload-to-cloudflare-stream` includes the overlays array.

## Out of scope
- Server-side burn‑in of overlays into the video.
- Migrating `overlay_payload` schema (already `jsonb`, version 2 unchanged).
- Trim / sound / cover commit behavior already benefits from the same fix.