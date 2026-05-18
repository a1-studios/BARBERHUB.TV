## Goal

Streamline the recording review step into a clean, mobile-first preview with a single **Edit** entry point that holds all advanced controls (trim, sound, text, cover).

## Changes

### 1. `RecordingReviewSheet.tsx` — strip clutter

- **Remove the Captions tab** entirely (and drop the `CaptionEditor` import + `captions` state + `captionsVtt` from `ReviewResult`). The upload flow stops sending VTT.
- **Remove the "Preview" tab label** — the preview *is* the screen. No tab bar by default.
- New default layout (top → bottom):
  1. Video preview frame (9:16, centered, max-height `60vh`) with any active text overlays composited on top so the user sees their result live.
  2. Aspect toggle pill above the video: `9:16` / `16:9` (9:16 selected by default). Toggle just swaps the container aspect class; overlays stay correctly positioned because they use normalized 0–1 coords.
  3. Single-line `Title` input (compact, no description textarea, no character counter chrome).
  4. Action row: **Retake · Edit · Publish**. "Save Draft" moves into the Edit sheet's overflow to reduce primary clutter.

### 2. New `EditPanel` (opens from the **Edit** button)

A second drawer/sheet (`Sheet` from shadcn) layered above the review. Tabs inside the edit panel:

- **Trim** — dual-handle range slider over the video timeline; sets `trimStart` / `trimEnd` (seconds). Live scrub preview.
- **Sound** — pick from a curated list of royalty-free clips (static array for now: `id`, `label`, `url`, `duration`). Volume slider for original audio (0–100) and music (0–100). Stores `{ soundId, originalVolume, musicVolume }`.
- **Text** — the existing `TextOverlayEditor` moves here unchanged.
- **Cover** — the existing `ThumbnailPicker` moves here.

Edit panel footer: `Cancel` / `Done`. `Done` commits state back to the review sheet; the live preview reflects it.

### 3. `ReviewResult` payload shape

```ts
interface ReviewResult {
  publish: boolean;
  title: string;
  aspect: '9:16' | '16:9';
  trim: { start: number; end: number } | null;
  sound: { id: string; originalVolume: number; musicVolume: number } | null;
  textOverlays: TextOverlay[];
  thumbnailDataUrl: string | null;
}
```

`description` and `captionsVtt` are removed.

### 4. `CameraStudio.tsx` — `uploadRecording` adjustments

Extend `overlay_payload` to include the new edit instructions so the backend ingest engine can apply them:

```ts
overlay_payload = {
  version: 2,
  source: { r2_key, r2_url },
  reference_resolution: aspect === '9:16'
    ? { width: 1080, height: 1920 }
    : { width: 1920, height: 1080 },
  aspect,
  trim,        // { start, end } | null
  sound,       // { id, originalVolume, musicVolume } | null
  overlays: [...text overlays...],
}
```

No DB migration needed — column is already `jsonb`. The `captions_vtt` argument to `upload-to-cloudflare-stream` is dropped from the call.

### 5. Files touched

- **Edit** `src/components/camera/RecordingReviewSheet.tsx` — new layout, aspect toggle, remove captions tab, mount Edit sheet.
- **New** `src/components/camera/EditPanel.tsx` — sheet with Trim / Sound / Text / Cover tabs.
- **New** `src/components/camera/TrimSlider.tsx` — dual-handle trim control.
- **New** `src/components/camera/SoundPicker.tsx` — sound list + volume sliders.
- **Edit** `src/components/camera/TextOverlayEditor.tsx` — minor: accept an `aspectClass` prop so the stage matches the chosen aspect.
- **Edit** `src/pages/CameraStudio.tsx` — drop captions wiring, extend `overlay_payload`.
- **Keep but unused for now**: `CaptionEditor.tsx` (left in repo, no imports).

## Out of scope

- Actual server-side trimming, sound mixing, or overlay burn-in (backend engine's job; we only emit the JSON spec).
- Uploading custom user music (curated library only for now).
- Per-overlay animation/entrance effects.

## Visual sketch

```text
┌──────────── Review your recording ────────────┐
│              [ 9:16 ] [ 16:9 ]                │
│        ┌──────────────────────┐               │
│        │                      │               │
│        │   video + overlays   │               │
│        │                      │               │
│        └──────────────────────┘               │
│   Title: [____________________________]       │
│                                               │
│   [ Retake ]   [ Edit ]   [ Publish ]         │
└───────────────────────────────────────────────┘

Edit sheet:  Trim | Sound | Text | Cover
```
