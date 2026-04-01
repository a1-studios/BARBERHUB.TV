

# Fix Live Stream Button Visibility + Enforce Cloudflare Stream ABR + R2 Buckets

## Issues Identified

1. **Live Stream button not visible**: The mode picker drawer has `max-h-[60vh]` which clips the 5th option on 390px mobile viewports. The drawer content area isn't scrollable, so "Live Stream" is cut off below the fold.

2. **CameraStudio recordings served as raw MP4**: After recording in Portfolio/Course/Tips modes, the `handleRecordingComplete` function uploads to R2 and stops — it never triggers Cloudflare Stream ingest. Users get raw MP4 playback with no adaptive bitrate.

3. **No organized R2 bucket folders for all media categories**: The R2_FOLDERS map only covers `portfolio`, `course`, and `tips`. The `recordings` category used by battles isn't represented, and there's no verification that all categories route correctly.

## Plan

### 1. Fix Drawer Overflow — Make Live Stream Visible
**File: `src/pages/CameraStudio.tsx`**

- Change `max-h-[60vh]` on the mode picker `DrawerContent` to `max-h-[75vh]`
- Add `overflow-y-auto` to the options container `div` so all 5 items are scrollable
- Visually distinguish the Live Stream option with a red/live accent (pulsing dot or colored border) so it stands out from recording modes

### 2. Auto-Ingest CameraStudio Recordings to Cloudflare Stream
**File: `src/pages/CameraStudio.tsx`**

In `handleRecordingComplete`, after the R2 upload succeeds, if the file is a video (always true for recordings):
- Call `upload-to-cloudflare-stream` edge function with `{ sourceUrl: publicUrl, table: 'creations', recordId }` (requires inserting a `creations` record first, like PortfolioManager does)
- Show a toast: "Optimizing video for playback..."
- This ensures all studio-recorded content gets ABR encoding

Currently `handleRecordingComplete` uploads to R2 but creates NO database record. This is a bug — the video is orphaned. Fix: insert a `creations` record (for portfolio/tips) or `creator_content` record (for courses) after upload, then trigger CF Stream ingest.

### 3. Ensure All Video Playback Uses CloudflareStreamPlayer
**File: `src/components/profiles/PortfolioManager.tsx`**

The portfolio gallery currently renders `<video src={mediaUrl}>` for videos. Update to check for `cloudflare_stream_uid` on the creation record and use `CloudflareStreamPlayer` when available, falling back to the raw URL.

### 4. Database Record Creation in CameraStudio
**File: `src/pages/CameraStudio.tsx`**

After successful R2 upload in `handleRecordingComplete`:
- For `portfolio` and `tips` modes: insert into `creations` table with `barber_id`, `media_url`, `category`
- For `course` mode: insert into `creator_content` table with appropriate fields
- Then trigger CF Stream ingest for the inserted record

This requires fetching the user's `barber_profile.id` — add a query at component mount.

### 5. Summary of File Changes

| File | Change |
|------|--------|
| `src/pages/CameraStudio.tsx` | Fix drawer max-height, add scroll, add Live Stream visual accent, insert DB records after recording, trigger CF Stream ingest |
| `src/components/profiles/PortfolioManager.tsx` | Use `CloudflareStreamPlayer` for videos with `cloudflare_stream_uid` |

No new edge functions or migrations needed — the `upload-to-cloudflare-stream` function and `cloudflare_stream_uid` columns already exist on all relevant tables.

