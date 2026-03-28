

## Fix: Update All Video Upload Limits from 100MB to 5GB

The enterprise multipart upload engine (`multipartUploadToR2`) was built but only wired into the **battle submission** modal. Three other video upload surfaces still use the old single-PUT approach with a 100MB cap:

1. **`src/components/barber/BarberVideoSection.tsx`** — Featured video upload on barber dashboard
2. **`src/pages/BarberPublicProfile.tsx`** — Featured video upload on public profile page
3. **`src/components/creator/EducatorUpload.tsx`** — Education content upload

### Changes per file

**`BarberVideoSection.tsx`**:
- Change `maxSize` from `100 * 1024 * 1024` to `5 * 1024 * 1024 * 1024`
- Update error message from "100MB" to "5GB"
- Update UI label from "Max 100MB" to "Max 5GB"
- Wire in `multipartUploadToR2` from `src/lib/storage` for files over ~50MB (use single PUT for small files, multipart for large)
- Add `ChunkedUploadProgress` component to show real progress during large uploads

**`BarberPublicProfile.tsx`**:
- Change video `maxSize` from `100 * 1024 * 1024` to `5 * 1024 * 1024 * 1024`
- Update all three UI labels ("Max 100MB", "100MB", "Max 1 video, 100MB") to reference 5GB
- Update error toast message
- Wire in multipart upload for large video files

**`EducatorUpload.tsx`**:
- Change size check from `100 * 1024 * 1024` to `5 * 1024 * 1024 * 1024`
- Update error toast and UI label from "Max 100MB" to "Max 5GB"
- Wire in multipart upload for large files

### Technical approach

For each file, import `multipartUploadToR2` and `ChunkedUploadProgress`. Use a size threshold (e.g., 50MB) to decide:
- **Small files (< 50MB)**: Keep existing single-PUT via `uploadToR2` for speed
- **Large files (≥ 50MB)**: Use `multipartUploadToR2` with chunked progress UI

Each upload surface will gain pause/resume/cancel controls and real chunk-by-chunk progress for large files.

