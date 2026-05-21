## What's actually broken (from the data + code)

I queried the DB and inspected the pipeline. Three concrete root causes:

1. **New uploads are stuck `stream_status='pending'` forever.**
   - Of the last 3 portfolio videos: 2 have NO `cloudflare_stream_uid` (the `upload-to-cloudflare-stream` call never succeeded or never ran), and 1 has a uid but was never flipped to `ready`.
   - `pollStreamReady` is fired and forgotten from the page. As soon as the user leaves CameraStudio / PortfolioManager, polling dies and the row stays `pending` forever.
   - Watch feed filters strictly on `stream_status='ready'`, so these uploads never show up. Portfolio tab on the public profile shows them (no filter) but as black tiles because there's no thumbnail and the player won't autoplay.

2. **No thumbnails are landing.** All recent rows have `stream_thumbnail_url = null` and `thumbnail_url = null`. The client-side `captureVideoThumbnail` + R2 PUT path is failing silently (likely the presigned-url call or a CORS issue on the thumbnail key), and because `stream_status` never goes ready, the Cloudflare poster never gets written either.

3. **Public profile layout** doesn't match what you asked for: Follow / Like / Donate sit below the name & stats; portfolio is `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` with loose spacing.

## Plan

### 1. Make stream readiness self-healing (server-side, not client-polled)

- **Cloudflare Stream webhook → `stream-webhook` edge function** (new). Register the project's webhook URL with Cloudflare once via their `/stream/webhook` API. The webhook fires on `ready` / `error` and we flip `stream_status`, `stream_thumbnail_url`, `stream_duration_seconds` from the server. This removes the dependency on the user keeping the page open.
- **Cron sweep `poll-stream-status-cron`** (new, scheduled every minute via `supabase/config.toml`): finds all rows with `stream_status='pending'` AND `cloudflare_stream_uid IS NOT NULL` older than 30s across `creations`, `creator_content`, `battle_submissions`, calls Cloudflare for each, and flips the status. This catches stragglers and re-ingests anything the webhook missed.
- **`upload-to-cloudflare-stream` fix**: it's currently being called but some rows ended up with no uid. Add real error surfacing back to the client (toast `"Cloudflare ingest failed — retry"`) and write `stream_status='errored'` on failure so a re-ingest job can pick it up.
- **Re-ingest sweep**: same cron also finds rows where `cloudflare_stream_uid IS NULL` AND `media_url` is a video AND `stream_status != 'ready'` older than 30s, and queues them into Cloudflare Stream via the existing copy-by-URL flow. This back-fills the 2 broken rows already in the DB and any future failures.
- **Backfill migration**: one-time script to re-trigger ingest for the existing `pending` rows that have a uid but were never flipped (just call the new cron's logic once).

### 2. Thumbnails that always exist

- **Server-side poster from Cloudflare**: once `readyToStream`, `poll-cloudflare-stream` / the new webhook writes `stream_thumbnail_url` (already coded — will just work once status flips).
- **Client-side first-frame fallback in the player tile**: in `PortfolioManager` and `WatchFeed`, when a tile has no `thumbnail_url` AND no `stream_thumbnail_url`, render a `<video preload="metadata" muted playsInline>` with `#t=0.1` fragment so the browser paints the first frame as a poster without downloading the whole file. This gives every tile a visible frame immediately, regardless of pipeline state.
- **Harden `captureVideoThumbnail` upload path**: await the result properly in the insert flow (today it's `Promise.resolve().then(...)` and the row is inserted before the thumb URL is known), so `thumbnail_url` actually gets persisted. Surface errors to console so we stop failing silently.

### 3. Watch feed & portfolio propagation

- **Watch feed (`WatchFeed.tsx`)**: relax the filter — include rows where `stream_status='ready'` OR (`cloudflare_stream_uid IS NULL` AND there is a playable `media_url`). This way legacy / non-Stream uploads still appear, while still hiding mid-transcode CF items.
- **Portfolio (`PortfolioManager.tsx`)**: show all items (owner sees everything), but tag in-flight tiles with a small "Processing…" badge when `stream_status='pending'`. Visitors see only ready items.

### 4. Public profile layout (`BarberPublicProfile.tsx`)

Re-layout the header card to match the spec:

```text
        [ AVATAR (centered) ]
   [ Follow ] [ Like ] [ Donate ]      ← single horizontal row, right under avatar
              El-bory 🇪🇸                ← name + flag below
            Luxury Grooming             ← tier badge
   5 Followers   ·   5 Likes   ·   $0 Donated   ← compact inline stats
```

- Move `BarberActionButtons` (Follow / Like / Donate) into a single `flex justify-center gap-2` row directly under the avatar, above the `h1`.
- Visitor-only buttons stay visitor-only; owners still see no action row.
- Compact stats from `text-3xl` stacked to one inline line with `·` separators and smaller text.
- **Portfolio grid**: change from `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4` to `grid-cols-3 gap-1.5` on mobile (sm `gap-2`, lg `grid-cols-4 gap-2`). Tiles become square, no card padding around them — pure media wall like IG. Title/category move into a hover/long-press overlay so the grid stays tight.

### 5. SmartVideoPlayer guardrails

- When `streamUid` is present but `stream_status !== 'ready'`, render a "preparing… we'll publish it shortly" placeholder with the captured first-frame poster, not a spinner — so the owner sees their video is in queue, not lost.

## Files

- new: `supabase/functions/stream-webhook/index.ts`, `supabase/functions/poll-stream-status-cron/index.ts`, `supabase/migrations/<ts>_reingest_pending_streams.sql`
- edit: `supabase/functions/upload-to-cloudflare-stream/index.ts` (surface errors, mark errored)
- edit: `supabase/config.toml` (schedule the cron, register webhook function)
- edit: `src/pages/WatchFeed.tsx` (relaxed filter, first-frame poster fallback)
- edit: `src/components/profiles/PortfolioManager.tsx` (await thumb upload, 3-col tight grid, first-frame fallback, processing badge)
- edit: `src/pages/BarberPublicProfile.tsx` (header re-layout: action row under avatar above name, inline stats, tighter portfolio grid)
- edit: `src/components/video/SmartVideoPlayer.tsx` ("preparing" state when streamUid + not ready)

## Notes / non-goals

- I'm not touching the multipart upload path — uploads succeed; the bug is downstream of R2.
- No changes to roles, economy, or other pages.
- After approval I'll run the DB migration first (re-ingest backfill) and you'll see existing broken rows recover within ~1 min of the cron's first tick.
