## Goal

Add a "Text" tab to the recording review step that lets creators place one or more text overlays on top of their video. Each overlay stores its content, font, styling, and spatial position. On Publish, ship that as a clean JSON payload next to the R2 video path so the backend rendering engine can burn the overlays into the final video later.

## UX (mobile-first, native iOS feel)

In `RecordingReviewSheet`, add a fourth tab: **Text** (alongside Preview, Captions, Cover).

The Text tab shows:
- Video preview (aspect-video, same player style as Captions tab) with overlays rendered as absolutely-positioned, draggable `div`s on top.
- "+ Add text" button — inserts a new overlay centered on the frame at the current playback time.
- Selected overlay editor panel:
  - Text input (max 60 chars)
  - Font family picker (curated list: Inter, Bebas Neue, Space Grotesk, DM Serif Display, Archivo Black, JetBrains Mono)
  - Font size slider (12–72 px, normalized)
  - Color swatches (white, black, neon orange `#FF6B00`, Zion blue, plus custom hex input)
  - Optional background pill toggle (transparent vs solid)
  - Start/end time inputs defaulting to `[current_time, current_time + 3s]`
  - Delete button
- Drag to reposition (pointer events, clamped to video bounds). Position stored as **normalized 0–1 coordinates** of the overlay's center, so it survives any output resolution.

No backend rendering work in this task — frontend captures intent only.

## Data Model

New type in `src/components/camera/TextOverlayEditor.tsx`:

```ts
export interface TextOverlay {
  id: string;            // uuid
  text: string;
  font_family: string;
  font_size: number;     // px at 1080p reference
  color: string;         // hex
  background: 'none' | 'solid';
  x: number;             // 0..1 (center x, normalized)
  y: number;             // 0..1 (center y, normalized)
  start: number;         // seconds
  end: number;           // seconds
}
```

Extend `ReviewResult` in `RecordingReviewSheet.tsx`:

```ts
textOverlays: TextOverlay[];   // [] when none
```

## Publish Payload

In `CameraStudio.uploadRecording`, after the R2 PUT succeeds, build a single overlay payload object and persist it on the same DB row that already holds `media_url`:

```ts
const overlayPayload = {
  version: 1,
  source: { r2_key: filename, r2_url: publicUrl },
  reference_resolution: { width: 1080, height: 1920 },
  overlays: result.textOverlays.map(o => ({
    id: o.id,
    type: 'text',
    text: o.text,
    style: {
      font_family: o.font_family,
      font_size: o.font_size,
      color: o.color,
      background: o.background,
    },
    position: { x: o.x, y: o.y, anchor: 'center' },
    timing: { start: o.start, end: o.end },
  })),
};
```

Write this to a new nullable JSONB column `overlay_payload` on the two rows already touched today: `creator_content` and `creations`. The Cloudflare Stream ingest call gets the same object forwarded under `overlayPayload` so the backend worker can pick it up when it's built later — for now the edge function just accepts and ignores it.

## Files

**New**
- `src/components/camera/TextOverlayEditor.tsx` — tab content, draggable overlay rendering, per-overlay editor.

**Edited**
- `src/components/camera/RecordingReviewSheet.tsx` — add Text tab, `textOverlays` state, include in `ReviewResult`.
- `src/pages/CameraStudio.tsx` — build `overlayPayload`, insert into `creations` / `creator_content`, forward to `upload-to-cloudflare-stream`.
- `supabase/functions/upload-to-cloudflare-stream/index.ts` — accept optional `overlayPayload` field (no-op for now, logged).
- `src/integrations/supabase/types.ts` — regenerated after migration.

**Migration**
- Add `overlay_payload jsonb` to `creator_content` and `creations`.

## Out of scope

- Actually rendering/burning the overlays into the video — backend engine work, handled separately.
- Animations, stickers, emojis, multi-line rich text — text-only v1.
- Editing overlays after publish.

