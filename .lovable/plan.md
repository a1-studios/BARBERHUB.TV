

# Universal Cloudflare Stream Auto-Ingest (D-1 Fix + UGC Pipeline)

## Problem
All video content currently serves raw MP4 files from R2, causing buffering for global users. Cloudflare Stream exists but is never automatically triggered — it requires manual invocation.

## What Changes

### PATCH 1: Automated Battle Pipeline (D-1 Fix)
**File: `supabase/functions/livekit-egress-webhook/index.ts`**

After the webhook successfully writes `barber_1_video_url` to the `battles` table (line 146-149), add a server-to-server call to the Cloudflare Stream API (`POST /stream/copy`) directly inline. This avoids needing an auth token to invoke `upload-to-cloudflare-stream` (which requires a Bearer token). The webhook already has access to `SUPABASE_SERVICE_ROLE_KEY` and runs server-side, so it will:

1. Read `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_STREAM_API_TOKEN` from env
2. POST the R2 public URL to Cloudflare Stream copy endpoint
3. On success, update `battles.cloudflare_stream_uid` with the returned UID
4. Log but do NOT fail the webhook if Stream ingest fails (the R2 fallback still works)

This is fire-and-await with graceful degradation — battle status transitions happen regardless.

### PATCH 2: User-Generated Content — Battle Submissions via `submit-battle-video`
**File: `supabase/functions/submit-battle-video/index.ts`**

After the video URL is saved to `battle_submissions` and `battles` (lines 140-176), add the same Cloudflare Stream copy logic. The submission's `media_url` is sent to Stream, and `battle_submissions.cloudflare_stream_uid` is updated. Only triggered when the URL looks like a video (ends in `.mp4`, `.mov`, `.webm`, or contains `/recordings/`).

### PATCH 3: User-Generated Content — Multipart Upload Completion
**File: `supabase/functions/complete-multipart-upload/index.ts`**

After the R2 multipart upload completes and `battle_submissions` is inserted (line 86-93), add the Cloudflare Stream copy call for the resulting R2 URL. The `key` already tells us it's a video (from the `recordings/` prefix and file extension). Update `battle_submissions.cloudflare_stream_uid`.

### PATCH 4: Portfolio Video Uploads (Frontend)
**File: `src/components/profiles/PortfolioManager.tsx`**

After `uploadPortfolioMedia` succeeds and the `creations` record is inserted (lines 67-75), if the file is a video (`file.type.startsWith('video/')`), invoke `upload-to-cloudflare-stream` with `{ sourceUrl, table: 'creations', recordId }`. Requires fetching the inserted record's ID via `.select().single()` on the insert.

### PATCH 5: Educator Upload (Already Partially Done — Verify)
**File: `src/components/creator/EducatorUpload.tsx`**

This component already calls `upload-to-cloudflare-stream` at lines 132-139. No changes needed — already correctly guarded by `isVideo` check. Confirmed working.

### NOT Touched (Image-Only Components)
- `CreationUpload.tsx` — only accepts images (`accept="image/*"`, 5MB limit). No Stream ingest needed.

## Shared Helper Pattern (Edge Functions)
To avoid code duplication across the 3 edge functions, each will use an inline async helper:

```typescript
async function ingestToCloudflareStream(
  sourceUrl: string, 
  table: string, 
  recordId: string, 
  supabaseAdmin: any
): Promise<string | null> {
  const cfAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const cfApiToken = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
  if (!cfAccountId || !cfApiToken) {
    console.warn('[CF-STREAM] Secrets not configured, skipping ingest');
    return null;
  }
  // Only ingest video files
  const videoExts = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
  const isVideo = videoExts.some(ext => sourceUrl.toLowerCase().includes(ext));
  if (!isVideo) {
    console.log('[CF-STREAM] Skipping non-video URL:', sourceUrl);
    return null;
  }
  // POST to Cloudflare Stream copy API
  // On success: update table.cloudflare_stream_uid
  // On failure: log and return null (graceful degradation)
}
```

## Database Consideration
The `battle_submissions` table already has a `cloudflare_stream_uid` column (confirmed in types). The `battles` table also has it. The `creations` table needs verification — if missing, a migration will add `cloudflare_stream_uid TEXT` to `creations`.

## UI Updates
- **PortfolioManager**: After a video upload, show a brief toast: "Video uploaded — optimizing for playback..." No blocking spinner needed since the Stream ingest happens asynchronously.
- **VideoSubmissionModal**: The existing upload flow already shows success. The Stream ingest happens server-side in the edge function, so no UI change needed — the `CloudflareStreamPlayer` in `BattleTheater` already handles the fallback gracefully.

## Prerequisites
The following Supabase secrets must be configured:
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_STREAM_API_TOKEN`

These are already referenced by `upload-to-cloudflare-stream` — if that function works, these secrets exist.

## Summary of Files Modified
1. `supabase/functions/livekit-egress-webhook/index.ts` — add inline CF Stream ingest after battle update
2. `supabase/functions/submit-battle-video/index.ts` — add inline CF Stream ingest after submission save
3. `supabase/functions/complete-multipart-upload/index.ts` — add inline CF Stream ingest after multipart completion
4. `src/components/profiles/PortfolioManager.tsx` — add client-side CF Stream invoke for video portfolio uploads
5. Migration (if needed) — add `cloudflare_stream_uid` column to `creations` table

