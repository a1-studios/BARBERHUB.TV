# Video Creation & Playback Overhaul

Three connected upgrades to bring CameraStudio + playback to enterprise grade.

---

## 1. Post-Record Review Flow (Retake / Save / Publish)

Today `CameraStudio.handleRecordingComplete` auto-uploads the blob as soon as `MediaRecorder.onstop` fires. We will insert a **Review Sheet** between "stop" and "upload".

**New component:** `src/components/camera/RecordingReviewSheet.tsx`
- Full-screen overlay on top of the studio
- Local `<video>` previewing the just-recorded `Blob` via `URL.createObjectURL`
- Scrubber, play/pause, mute, duration
- Three primary actions:
  - **Retake** → discard blob, return to live preview, reset timer
  - **Save Draft** → upload to R2 + insert `creations`/`creator_content` row with `is_published: false` (new column, default `true` for backward compat)
  - **Publish** → existing upload + Cloudflare Stream ingest path, marked published
- Secondary: **Add Captions** (opens Caption Editor — section 2)
- Title + description inputs (pre-filled with current placeholder)
- Thumbnail picker: grab 3 frames via `<canvas>` at 25/50/75% and let user pick

**Wiring in `CameraStudio.tsx`:**
- Replace `mr.onstop = () => handleRecordingComplete()` with `mr.onstop = () => setPendingBlob(...)` which opens the sheet
- Move all upload logic out of inline handler into `uploadRecording(blob, { publish, captions, thumbnail })`

**DB migration:**
- Add `is_published BOOLEAN DEFAULT true`, `captions_vtt TEXT`, `thumbnail_url TEXT` to `creations` and `creator_content` (if not present)
- Add RLS: barber can SELECT/UPDATE own drafts; public sees only `is_published = true`

---

## 2. Caption Authoring + Burned/Sidecar Display

**Editor:** `src/components/camera/CaptionEditor.tsx`
- Opens from the review sheet
- Timeline strip with the local video
- "Add caption at current time" → row with start/end (seconds) + text
- Live preview overlays caption on the video using a positioned div
- Export to **WebVTT** string

**Storage strategy (sidecar, not burned in):**
- Save `.vtt` text to a new `captions` column on the media row (`captions_vtt TEXT`)
- Cheaper, editable later, and respects accessibility
- Burned-in captions would require ffmpeg in an Edge Function — out of scope; sidecar gives equivalent UX

**Playback rendering:**
- Extend `CloudflareStreamPlayer` to accept `captionsVtt?: string`
- For Cloudflare Stream: upload VTT track via `/stream/:uid/captions/:lang` in a follow-up call from `upload-to-cloudflare-stream` once `streamUid` is known
- For native `<video>` fallback: render `<track kind="subtitles" srcLang="en" default src={blobUrlFromVtt}>`

---

## 3. Enterprise-Grade Playback (the "why is it laggy" fix)

Root causes in the current setup:

1. **`creations` legacy rows** play the raw R2 MP4 via native `<video>` — single bitrate, no ABR, full file pulled, no edge caching tuned for video
2. **`CloudflareStreamPlayer`** uses `@cloudflare/stream-react` which is fine but we never:
   - Set a proper `poster` (cold-start jank)
   - Preload metadata for the next item in feeds (no prefetch)
   - Pause off-screen videos (multiple decoders fight for GPU)
3. **WatchFeed** (vertical TikTok-style) keeps every mounted video decoding — biggest perf killer on mobile
4. R2 fallback URLs aren't served through Cloudflare's video-optimized cache rules

**Fixes:**

### 3a. Force CF Stream for all new videos (already happening) + backfill
- Add `scripts/backfill-cloudflare-stream.ts` that finds `creations` / `creator_content` / `battle_submissions` rows with `media_url` but no `cloudflare_stream_uid` and invokes the existing `upload-to-cloudflare-stream` function in batches
- Surface progress in Sovereign HQ → new "Media Pipeline" card

### 3b. Smart player upgrade — `src/components/video/SmartVideoPlayer.tsx`
Wraps `CloudflareStreamPlayer` and adds:
- **IntersectionObserver** — only the video with ≥60% visibility plays; others pause and release decoder
- **Preload neighbor** — when item N enters, prefetch poster + first HLS segment of N+1 (via `<link rel="prefetch">`)
- **Adaptive quality hints** — pass `preload="metadata"` + `defaultTextTrack="en"`
- **Buffering telemetry** — log stall events to `seo_events` table (reuse from prior SEO work) for later optimization
- **Single-decoder guarantee** — global Zustand store tracks the currently-playing video id; mounting a new one pauses the previous

### 3c. WatchFeed refactor
- Replace direct `<video>` usage with `<SmartVideoPlayer>`
- Virtualize the list so only ±2 items around the active one are mounted (use `@tanstack/react-virtual`, already used elsewhere or add it)

### 3d. R2 fallback tuning
- Add `Cache-Control: public, max-age=31536000, immutable` on the presigned-PUT response in `get-r2-presigned-url` so CF edge caches segments
- Document required Cloudflare rule: enable "Cache Everything" + tiered cache on the R2 custom domain

### 3e. Posters
- During recording review, save the chosen thumbnail to a new `thumbnail_url` column
- `SmartVideoPlayer` always renders the poster first → eliminates black flash

---

## File Inventory

**Created**
- `src/components/camera/RecordingReviewSheet.tsx`
- `src/components/camera/CaptionEditor.tsx`
- `src/components/camera/ThumbnailPicker.tsx`
- `src/components/video/SmartVideoPlayer.tsx`
- `src/stores/activeVideoStore.ts` (Zustand, single-decoder guard)
- `scripts/backfill-cloudflare-stream.ts`
- `supabase/migrations/<ts>_media_review_and_captions.sql`

**Modified**
- `src/pages/CameraStudio.tsx` — split upload from stop, open review sheet
- `src/components/CloudflareStreamPlayer.tsx` — accept `captionsVtt`, `posterUrl`, expose play/pause via ref
- `src/pages/WatchFeed.tsx` — virtualize + use SmartVideoPlayer
- `src/components/profiles/PortfolioManager.tsx` — render via SmartVideoPlayer
- `src/components/battles/SubmissionPreview.tsx` — same
- `src/components/VideoPlayer.tsx` — same
- `supabase/functions/get-r2-presigned-url/index.ts` — set Cache-Control
- `supabase/functions/upload-to-cloudflare-stream/index.ts` — also upload VTT track when present
- `src/components/sovereign/` — add MediaPipelinePanel showing backfill progress

**DB columns added**
- `creations`: `is_published`, `captions_vtt`, `thumbnail_url`
- `creator_content`: `captions_vtt`, `thumbnail_url`
- `battle_submissions`: `captions_vtt`, `thumbnail_url`

---

## Out of scope
- Server-side caption burn-in (would need ffmpeg in a worker)
- AI auto-captions (can be added later via Whisper)
- DRM / signed playback URLs
- Native iOS app changes