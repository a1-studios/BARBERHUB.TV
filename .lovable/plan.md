## Goals

1. WatchFeed: no back-to-back duplicates, keep randomness, prepared to scale.
2. Stop labeling the "Featured Video" — show creator name + sponsor only.
3. Complete the three deferred follow-ups from the video pipeline work:
   - Backfill legacy R2 videos into Cloudflare Stream.
   - Sovereign HQ "Media Pipeline" panel.
   - Swap secondary players (PortfolioManager, SubmissionPreview) to SmartVideoPlayer.

## Implementation

### 1. WatchFeed de-duplication (`src/pages/WatchFeed.tsx`)
- Dedupe sources before shuffling: build `allItems` then `uniqueByMediaUrl` (and by `cloudflare_stream_uid` when present) so a video that exists in both `creations` and `barber_profiles.featured_video_id` only appears once.
- Replace the simple Fisher–Yates + modulo loop with an **anti-adjacent shuffle**: after shuffling, walk the array and swap any item whose `barber_user_id` (or `media_url`) matches the previous one with the next non-conflicting item. Falls back gracefully when the pool is small.
- When extending the feed past `allContent.length` (the loop-pass logic), guarantee the first repeat is not the same item as the last unique entry.
- Keep query `.limit(30)` per source today, but extract a `FEED_SOURCE_LIMIT` constant and add a `// scale: paginate via range()` TODO comment so we can swap to keyset pagination later without refactoring the merger.

### 2. Remove "Featured Video" label
- `BarberPublicProfile.tsx` (line ~648): replace the `Featured Video` / `🔴 Live Stream` header with creator name + active sponsor pill (reuse `useSponsorAds`, pick first active). Live state still shows the red `LIVE` dot but no "Featured Video" copy.
- `BarberVideoSection.tsx`: stop inserting `title: 'Featured Video'` into `creations` — use the file name (or null) so portfolio gallery doesn't show that label either.
- Sweep: no other UI strings reference "Featured Video".

### 3. Backfill script (`scripts/backfill-cloudflare-stream.ts`)
- Node/tsx script using the service-role key from env. Scans `creations`, `creator_content`, `battle_submissions`, `barber_profiles.featured_video_id` for rows where `cloudflare_stream_uid IS NULL` and `media_url` is an http(s) `.mp4|.mov|.webm`.
- Batched (10 at a time, 2s gap) calls to existing `upload-to-cloudflare-stream` edge function with `{ sourceUrl, table, recordId }`.
- Dry-run flag (`--dry`), per-table filter (`--table=creations`), progress log + final summary written to `/tmp/backfill-report.json`.
- Add `"backfill:cf-stream": "tsx scripts/backfill-cloudflare-stream.ts"` to `package.json`.

### 4. Sovereign HQ — Media Pipeline panel
- New `src/components/sovereign/MediaPipelinePanel.tsx`:
  - Counters: total video rows, ingested (`cloudflare_stream_uid` set), pending, failed (per table).
  - Recent ingest log table (last 50) reading from `creator_content` / `creations` ordered by `updated_at`.
  - "Run backfill" CTA that calls a new `sovereign-system-control` action `run_media_backfill` which enqueues by invoking `upload-to-cloudflare-stream` for the next N pending rows (no shell script needed in prod).
  - Health bar: % ingested, with red/amber/green thresholds.
- Register panel in `src/pages/SovereignHQ.tsx` alongside the existing 13 panels.
- Extend `supabase/functions/sovereign-system-control/index.ts` with the `run_media_backfill` action (auth-gated to SOVEREIGN_EMAIL, batches up to 25 rows per call).

### 5. Secondary player refactors
- `src/components/profiles/PortfolioManager.tsx`: replace the inline `<video>` / `CloudflareStreamPlayer` block in the grid with `SmartVideoPlayer` (autoplay off, muted, poster = `thumbnail_url`). Keeps single-decoder guard active for portfolio grids.
- `src/components/battles/SubmissionPreview.tsx`: same swap for the preview player.
- Both keep their existing props/styling — purely an implementation swap.

## Out of Scope
- Server-side ffmpeg caption burn-in.
- Real-time SSE for backfill progress (panel polls every 10s).
- Pagination/keyset rewrite of WatchFeed queries (marked as TODO, not done now).

## Files

**Create**
- `scripts/backfill-cloudflare-stream.ts`
- `src/components/sovereign/MediaPipelinePanel.tsx`

**Modify**
- `src/pages/WatchFeed.tsx` (dedup + anti-adjacent shuffle)
- `src/pages/BarberPublicProfile.tsx` (remove "Featured Video" label)
- `src/components/barber/BarberVideoSection.tsx` (stop seeding "Featured Video" title)
- `src/components/profiles/PortfolioManager.tsx` (use SmartVideoPlayer)
- `src/components/battles/SubmissionPreview.tsx` (use SmartVideoPlayer)
- `src/pages/SovereignHQ.tsx` (mount new panel)
- `supabase/functions/sovereign-system-control/index.ts` (`run_media_backfill` action)
- `package.json` (script entry)
