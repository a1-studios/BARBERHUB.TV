## Goal
The video flashes onto the feed the instant the R2 upload finishes, but Cloudflare Stream hasn't transcoded it yet — so HLS isn't ready and the player ends up serving the raw mp4 (laggy on mobile). Uploads are also a single PUT (slow, no progress, can stall on flaky mobile networks). And portfolio tiles often have no thumbnail.

We will:
1. Only show a video in the feed once Cloudflare Stream reports `ready` (so what's served is the optimized HLS).
2. Switch the R2 upload path from a single PUT to a chunked/multipart upload with real progress.
3. Auto-generate a portfolio thumbnail at record time and prefer Cloudflare's poster once ready.

## Changes

### 1. Readiness gate (no more raw-mp4 fallback in the feed)
- Add columns to `creations` (and mirror on `creator_content`, `battle_submissions`): `stream_status text default 'pending'` ('pending' | 'ready' | 'errored'), `stream_ready_at timestamptz`, `stream_thumbnail_url text`, `stream_duration_seconds numeric`.
- `upload-to-cloudflare-stream` edge function:
  - After the `copy` call, set `stream_status='pending'`.
  - Add a new edge function `poll-cloudflare-stream` that, given a uid, queries CF Stream `GET /stream/{uid}`, and when `readyToStream === true`, writes `stream_status='ready'`, `stream_thumbnail_url`, `stream_duration_seconds`. Called from the client after upload with exponential backoff (3s → 30s, max 5 min) and also from a cron pass for stragglers.
- `WatchFeed.tsx`: filter `stream_status = 'ready'` (or items with no stream uid at all, i.e. images). Items still processing show a small "Processing… we'll publish it when it's ready" toast on the uploader side, but they never appear mid-transcode in the feed.
- `SmartVideoPlayer`: when a `streamUid` is supplied, do NOT fall back to the raw R2 mp4 — that path was masking the real problem. Keep HLS-only with a clean "still preparing" placeholder if it ever errors.

### 2. Chunked / multipart upload with progress
- The project already has `initiate-multipart-upload`, `presign-upload-part`, `complete-multipart-upload`, `abort-multipart-upload` edge functions — use them.
- Add `src/lib/multipartUpload.ts` with a `uploadFileMultipart(file, { onProgress, partSize = 8 * 1024 * 1024, concurrency = 3 })` helper:
  - Initiate → for each 8 MB chunk presign + PUT (3 in parallel) → collect ETags → complete. Abort on failure.
  - Returns the final public URL + key.
- `CameraStudio.tsx` and `PortfolioManager.tsx` upload paths: switch from `get-r2-presigned-url` + single PUT to `uploadFileMultipart`. Small files (<8 MB) still go through the single presigned PUT for speed.
- Surface progress as a real percentage in the existing "Uploading…" UI, then a "Optimizing for playback…" state while we poll Cloudflare Stream.

### 3. Portfolio thumbnails + smooth playback
- On record/upload, generate a client-side poster from the first decodable frame (`HTMLVideoElement` + `canvas.toBlob`) and upload it to R2 alongside the video — write its public URL into `creations.thumbnail_url`. This guarantees a poster even before CF Stream finishes.
- When `stream_status='ready'`, prefer `stream_thumbnail_url` (CF Stream's frame) as the poster — it's smaller and CDN-cached.
- `PortfolioManager.tsx` tile: render `<img poster>` until tapped, then mount `SmartVideoPlayer`. This eliminates the cold-start lag of mounting an HLS instance per tile and matches the IG/TikTok feel.

## Technical notes
- New migration adds the 4 columns + index on `(stream_status, created_at)` for fast feed queries.
- `poll-cloudflare-stream` uses the existing `CLOUDFLARE_STREAM_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets; no new secrets needed.
- CORS: R2 bucket already exposes `ETag` (required for multipart). If a part PUT fails to return ETag, surface a clear error pointing to the CORS doc.
- The MP4-fallback logic added previously to `SmartVideoPlayer` is removed for Stream-backed items; it stays for legacy items that have only `fallbackUrl`.

## Files touched
- new: `supabase/migrations/<ts>_stream_readiness_columns.sql`
- new: `supabase/functions/poll-cloudflare-stream/index.ts`
- new: `src/lib/multipartUpload.ts`
- new: `src/lib/videoThumbnail.ts`
- edit: `supabase/functions/upload-to-cloudflare-stream/index.ts` (set initial status, return status)
- edit: `src/pages/WatchFeed.tsx` (filter `stream_status='ready'`, drop raw-mp4 entries)
- edit: `src/pages/CameraStudio.tsx` (multipart upload, thumbnail capture, post-upload polling, "Optimizing…" state)
- edit: `src/components/profiles/PortfolioManager.tsx` (multipart upload, thumbnail, tap-to-play tile)
- edit: `src/components/video/SmartVideoPlayer.tsx` (HLS-only when streamUid present, "preparing" placeholder)
