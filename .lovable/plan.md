

# Cloudflare Stream VOD Swap + B2B Academy RBAC

## Current State

- **No `cloudflare_stream_uid` columns exist** in the database. Videos are stored as raw R2 URLs in `barber_1_video_url`, `barber_2_video_url`, `featured_video_id`, `media_url` (creations, creator_content, battle_submissions).
- **No Cloudflare Stream secrets** found in Supabase Edge Function secrets. User claims they've been added — needs verification. The secrets required: `CLOUDFLARE_STREAM_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- **`@cloudflare/stream-react`** is not installed.
- All VOD playback uses native `<video>` elements across: `BrandedVideoPlayer`, `HLSVideoPlayer`, `VideoPlayer`, `MP4Player` (BattleTheater), and inline `<video>` in `WatchFeed`.
- The `BattleTheater` already has correct live/processing/vod phase routing via `localPhase`.
- The `creator_content` table already has the course gating RLS from the previous migration. The `WatchFeed` already filters educator items for fans. `CreatorHub` already redirects non-barbers.

## Pre-Requisite: Secrets Verification

Before proceeding, verify that `CLOUDFLARE_STREAM_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are available as Supabase Edge Function secrets. If not, they must be added before the edge function can work.

## Plan

### Step 1: Database Migration — Add `cloudflare_stream_uid` columns

Add a `cloudflare_stream_uid TEXT` column to:
- `battles` — for the combined replay UID after egress processing
- `battle_submissions` — per-barber VOD UID
- `creator_content` — for course/tutorial VOD UID
- `creations` — for portfolio VOD UID

These columns store the Cloudflare Stream video UID returned after upload. The existing `media_url`/`barber_X_video_url` fields remain as the R2 source URL, while `cloudflare_stream_uid` holds the Cloudflare-assigned UID for the `<Stream>` component.

### Step 2: Edge Function — `upload-to-cloudflare-stream`

Create a new Supabase Edge Function that:
1. Accepts `{ sourceUrl, table, recordId }` from authenticated requests
2. Calls Cloudflare Stream's "Upload via URL" API using stored secrets
3. Returns the `uid` to the caller
4. Updates the appropriate table's `cloudflare_stream_uid` column

This function will be called:
- By the `livekit-egress-webhook` after battle recording is finalized (auto-upload replay)
- By `EducatorUpload` after uploading a course video to R2
- By portfolio upload flows after uploading to R2

### Step 3: Install `@cloudflare/stream-react`

Add the npm dependency.

### Step 4: Create `CloudflareStreamPlayer` wrapper component

A new component `src/components/CloudflareStreamPlayer.tsx` that:
- Accepts `streamUid: string | null | undefined` and optional `fallbackUrl`
- If `streamUid` is set, renders `<Stream src={streamUid} controls responsive />`
- If `streamUid` is null but `fallbackUrl` exists, falls back to native `<video>` (backwards compat)
- If neither, shows a "Video Processing..." transcoding UI with a spinner and message

### Step 5: Replace VOD `<video>` elements with `CloudflareStreamPlayer`

**Files to update:**

| Component | Current player | Change |
|-----------|---------------|--------|
| `BattleTheater.tsx` (VOD phase) | `MP4Player` / `HLSVideoPlayer` | Use `CloudflareStreamPlayer` with `battle.cloudflare_stream_uid` or per-barber UIDs, falling back to existing URLs |
| `WatchFeed.tsx` (`renderVideoItem`) | Inline `<video>` | Use `CloudflareStreamPlayer` with `item.cloudflare_stream_uid`, fallback to `item.media_url` |
| `BrandedVideoPlayer.tsx` | Native `<video>` | Add `streamUid` prop; when set, render `<Stream>` instead of `<video>` |
| `BarberVideoSection.tsx` | `BrandedVideoPlayer` | Pass through `cloudflare_stream_uid` if available |
| `HLSVideoPlayer.tsx` | Native `<video>` | Add `streamUid` prop; when set, render `<Stream>` |

**Not touched**: LiveKit components, ContenderVideoPreview, CameraStudio, HaircutAdvisorModal (these are live camera/WebRTC, not VOD).

### Step 6: BattleTheater Phase Routing Refinement

The existing `localPhase` state machine (`live` → `processing` → `vod`) is already correct. Refinements:
- In the VOD phase, read `battle.cloudflare_stream_uid` (or per-submission UIDs)
- If UID exists, render `CloudflareStreamPlayer` with adaptive HLS
- If UID is null (still transcoding), show the Processing/Transcoding fallback UI from Step 4

### Step 7: Processing/Transcoding Fallback UI

Enhance `ProcessingArena.tsx` to also serve as the transcoding state:
- Add a `reason` prop: `'battle_processing' | 'transcoding'`
- For transcoding: show "Optimizing for high-quality playback..." with a polished animation
- Subscribe to realtime updates on `cloudflare_stream_uid` column changes to auto-transition

### Step 8: Academy/Education RBAC (Frontend Hardening)

The database RLS was already applied in the previous migration. Frontend hardening:
- `WatchFeed.tsx` already filters educator items for fans (done in previous change)
- `CreatorHub.tsx` already redirects non-barbers (already implemented)
- Add explicit toast + redirect if a fan navigates directly to an educator content URL
- Ensure `BottomNavBar` has no Academy tab (confirmed — it doesn't have one currently)

## Files to Create/Modify

| File | Action |
|------|--------|
| New migration SQL | Add `cloudflare_stream_uid` to 4 tables |
| `supabase/functions/upload-to-cloudflare-stream/index.ts` | New edge function |
| `src/components/CloudflareStreamPlayer.tsx` | New wrapper component |
| `src/pages/BattleTheater.tsx` | Use CloudflareStreamPlayer in VOD phase |
| `src/pages/WatchFeed.tsx` | Use CloudflareStreamPlayer in feed items |
| `src/components/BrandedVideoPlayer.tsx` | Add streamUid prop |
| `src/components/battles/HLSVideoPlayer.tsx` | Add streamUid prop |
| `src/components/battles/ProcessingArena.tsx` | Add transcoding variant |
| `src/components/creator/EducatorUpload.tsx` | Call upload-to-cloudflare-stream after R2 upload |
| `package.json` | Add `@cloudflare/stream-react` |

## Technical Details

```text
VOD Playback Pipeline:
  1. Video uploaded to R2 → raw URL stored in media_url
  2. Edge function calls Cloudflare Stream "copy from URL" API
  3. Cloudflare returns uid → stored in cloudflare_stream_uid column
  4. Frontend reads cloudflare_stream_uid → renders <Stream src={uid} />
  5. If uid is null → show transcoding fallback UI
  6. Once uid appears (via realtime) → auto-mount Stream player

Battle Phase Routing:
  status === 'live'       → LiveKit Subscriber (untouched)
  status === 'processing' → ProcessingArena (transcoding UI)
  status === 'voting/completed' → CloudflareStreamPlayer (HLS VOD)
```

