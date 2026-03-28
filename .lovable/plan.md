

## Diagnostic Patch: Aggressive Logging for Single-PUT R2 Uploads + Content-Type Alignment

### Problem
The single-PUT upload path (`uploadToR2` in `src/lib/storage.ts`) has minimal error logging — if the R2 PUT fails due to CORS caching or a signature mismatch, the error message is generic and unhelpful. The multipart path already has detailed logging, but the small-file path does not.

There is also a **potential Content-Type signature mismatch**: the presigned URL is generated with `ContentType` (e.g., `video/mp4`), but the frontend sends whatever `file.type` reports. If these differ, R2 returns a 403 `SignatureDoesNotMatch`. The current code passes `contentType` from the frontend to the edge function, but the frontend PUT also sends a `Content-Type` header — these must match exactly.

### Changes

**File: `src/lib/storage.ts`**

1. **Add aggressive diagnostic logging to `uploadToR2`** (the single-PUT path, lines 252-278):
   - Log the presigned URL domain, key, and content type before the PUT
   - On failure: log HTTP status, all response headers, and first 500 chars of body
   - On success: log confirmation with status and headers
   - This mirrors the logging already present in `uploadChunk` for multipart

2. **Fix Content-Type alignment**: Ensure the `Content-Type` header sent in the frontend PUT matches exactly what was used to generate the presigned URL. Currently `uploadFileToR2` passes `file.type || 'application/octet-stream'` to `uploadToR2`, which then passes `contentType` to the edge function AND uses it in the PUT header — this looks correct, but add a console log to confirm alignment.

3. **Add edge function response logging**: Log the full response from `get-r2-presigned-url` so we can see the exact presigned URL domain and verify it matches the R2 endpoint.

**No edge function changes needed** — the current edge functions have correct bucket names and logging. The diagnostic gap is purely client-side.

### Technical detail

```text
Current uploadToR2 error handling:
  throw new Error(`Upload failed: ${status} ${statusText}`)  ← no headers, no body

After patch:
  console.error('[R2-SINGLE-PUT] HTTP ${status}', { 
    statusText, headers, body, contentType, key 
  })
  → Reveals if it's 403 (signature), 0 (CORS block), or other
```

### Files to modify
- `src/lib/storage.ts` — add logging to `uploadToR2` function and `uploadFileToR2` entry point

### Expected outcome
- If CORS is now working: upload succeeds, console shows `[R2-SINGLE-PUT] Success` with ETag
- If CORS cache stale: console shows `TypeError: Failed to fetch` or status 0 — user waits 5 min and retries
- If signature mismatch: console shows 403 with `SignatureDoesNotMatch` in body — we fix the Content-Type alignment

