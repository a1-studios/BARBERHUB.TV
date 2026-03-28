

## Enterprise Direct-to-R2 Multipart Video Upload — Implementation Plan

### Diagnostic Summary

**What exists already:**
- Three edge functions (`initiate-multipart-upload`, `presign-upload-part`, `complete-multipart-upload`) with basic S3 SDK v3 integration against R2
- `src/lib/storage.ts` with single-PUT `uploadToR2` (no chunking, no progress, crashes on large files)
- `VideoSubmissionModal.tsx` uses single-file PUT upload capped at 500MB with fake progress
- R2 secrets (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`) already configured
- `useUserRole` hook provides `isBarber` check client-side

**What is broken or missing:**
- `presign-upload-part` generates **one URL per call** — for a 2GB file (400 chunks), that's 400 sequential edge function calls. Needs batch support.
- No barber role enforcement on edge functions — any authenticated user can upload
- No abort/cleanup endpoint if upload is cancelled mid-way (orphaned R2 parts)
- No chunking logic on the frontend — the entire file blob is sent in one PUT
- No pause/resume/cancel capability
- No per-chunk retry logic
- Progress bar is fake (jumps to 100% on completion)
- 500MB file size cap is arbitrary and too low for 5GB target

---

### Step 1: Upgrade Edge Functions

**a) `presign-upload-part` — Add batch mode:**
Accept either `partNumber` (single, backward-compat) or `partNumbers: number[]` (batch). Return `presignedUrls: { partNumber, presignedUrl }[]`. This reduces 400 calls to ~40 calls (batches of 10).

**b) `initiate-multipart-upload` — Add barber role check:**
After JWT validation, query `user_roles` table to confirm user has `barber` role. Return 403 if not.

**c) `complete-multipart-upload` — Add DB sync:**
After R2 stitching succeeds, insert a record into `battle_submissions` linking the public URL to the user and battle. This completes the pipeline without requiring a separate client call.

**d) New: `abort-multipart-upload` edge function:**
Accepts `key` + `uploadId`, calls `AbortMultipartUploadCommand` to clean up orphaned parts when user cancels.

---

### Step 2: Chunked Upload Engine (`src/lib/storage.ts`)

New export: `multipartUploadToR2(file, battleId, callbacks)` with this architecture:

```text
File (up to 5GB)
  ├── Slice into 5MB chunks (File.slice, zero-copy)
  ├── Call initiate-multipart-upload → get uploadId + key
  ├── Request presigned URLs in batches of 10
  ├── Upload 4 chunks concurrently (Promise pool)
  │   ├── Each chunk: fetch(PUT) to presigned URL
  │   ├── Capture ETag from response header
  │   └── On failure: retry 3x with exponential backoff
  ├── Track completed parts in state array
  ├── Report progress: completedChunks / totalChunks
  └── Call complete-multipart-upload with all ETags
```

Key design:
- **AbortController** passed through for cancel support
- **Pause**: stop dispatching new chunks from the pool (in-flight chunks finish)
- **Resume**: restart the pool from the last incomplete chunk
- **State object** returned to caller: `{ pause(), resume(), cancel(), promise }`
- File is never loaded into memory — `File.slice()` returns a Blob view

---

### Step 3: `ChunkedUploadProgress` Component

Dedicated React component showing:
- "Uploading chunk 47 of 400" text
- True percentage bar based on confirmed chunks (not bytes sent)
- Upload speed estimate (bytes confirmed / elapsed time)
- Three buttons: **Pause** (yellow), **Resume** (green), **Cancel** (red)
- Status states: `idle`, `uploading`, `paused`, `completing`, `done`, `error`
- On cancel: calls `abort-multipart-upload` to clean R2

---

### Step 4: Rewrite `VideoSubmissionModal` Upload Tab

- Remove 500MB cap, set to 5GB (`5 * 1024 * 1024 * 1024`)
- Replace `uploadBattleVideo` call with `multipartUploadToR2`
- Mount `ChunkedUploadProgress` component during active upload
- The `complete-multipart-upload` edge function handles DB insertion, so no separate `submit-battle-video` call needed for the upload path
- Keep the "Paste URL" tab untouched

---

### Files Summary

| Action | File |
|--------|------|
| Rewrite | `supabase/functions/presign-upload-part/index.ts` (batch mode) |
| Update | `supabase/functions/initiate-multipart-upload/index.ts` (barber role check) |
| Update | `supabase/functions/complete-multipart-upload/index.ts` (DB sync) |
| Create | `supabase/functions/abort-multipart-upload/index.ts` |
| Update | `src/lib/storage.ts` (add `multipartUploadToR2` engine) |
| Create | `src/components/battles/ChunkedUploadProgress.tsx` |
| Update | `src/components/battles/VideoSubmissionModal.tsx` (wire chunked engine) |

### Technical Constraints Honored
- **Zero pass-through**: Video bytes go client → R2 presigned URL. Edge functions only generate URLs.
- **5MB minimum**: All chunks except the last are exactly 5,242,880 bytes.
- **R2 keys server-only**: S3Client instantiation is exclusively in edge functions.
- **No rebuild**: Auth flows, routing, and existing UI tabs are preserved.

