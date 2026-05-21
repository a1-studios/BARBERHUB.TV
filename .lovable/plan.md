# Fix Barber Video Recording Upload

## What's actually happening

The R2 upload itself works — I confirmed today's recorded file is live at `https://media.barberhub.tv/portfolios/1779397316476_studio.mp4` (HTTP 200, 1.9 MB). But there are **0 rows in the `creations` table from today** (latest is May 9), even though the `upload-to-cloudflare-stream` edge function was clearly invoked three times today with record IDs that don't exist anywhere in the database.

That means the DB insert from `CameraStudio.tsx` is either failing silently or the row is being rejected — and **the user gets no feedback either way**, because the code swallows the error:

```ts
// src/pages/CameraStudio.tsx ~line 349
const { data: record } = await supabase.from('creations').insert({...}).select('id').single();
// no `error` captured, no toast, no console.error
if (record && result.publish) { ...CF stream invoke... }
```

The flow currently shows "Video published!" toast on R2 success even when the DB row never lands, so the barber thinks it worked.

## Root issues to fix

1. **Silent insert errors** in `CameraStudio.tsx` (and the same pattern in `PortfolioManager.tsx`, `EducatorUpload.tsx`).
2. **Missing barber_profile** is treated as a no-op — entire `if (barberProfile)` block is skipped, no DB write, no toast. Barber sees "published" but nothing was saved.
3. **Category mismatch**: `CameraStudio` writes `category: 'haircut'` for portfolio video, while `PortfolioManager` writes `category: 'video'`. WatchFeed likely filters on one of these, so even successful rows may not appear.
4. **Premature success toast**: `toast.success('Video published!')` fires before DB insert is confirmed.
5. **No retry / no debug logging** when CF Stream ingest fails — we lose the trail.

## Plan

### 1. Harden `uploadRecording` in `src/pages/CameraStudio.tsx`

- Capture `error` from every `supabase.from(...).insert(...)` and `throw` it so the outer `catch` shows a real toast (`Save failed: <message>`).
- Capture `error` from the `barber_profiles` lookup; if no row, show explicit toast "Your barber profile is missing — finish onboarding to publish videos." and abort.
- Move the `toast.success('Video published!')` to **after** the insert resolves successfully (currently fires regardless).
- Normalize portfolio video `category` to `'video'` (match `PortfolioManager`) so WatchFeed picks them up. Keep `'tips'` for tips mode.
- Add `console.info('[CameraStudio] inserted creation', record.id)` so the trail is visible in the browser.
- Pass `is_published: result.publish` but also write a draft row when `result.publish === false` so retake/save-as-draft is testable.

### 2. Apply the same error-surfacing pattern to sibling uploaders

- `src/components/profiles/PortfolioManager.tsx` (line ~71): already destructures `insertErr` but the surrounding `for` loop logs `Upload error:` without the field name — include the supabase error message in the toast for that file.
- `src/components/creator/EducatorUpload.tsx`: confirm the same `insert(...).select().single()` pattern surfaces errors; fix if missing.

### 3. Make CF Stream invoke awaitable (optional, behind the success toast)

- Today the CF Stream call is fire-and-forget (`.catch(console.error)`), so even when DB row exists, the playable HLS URL never lands if the ingest fails. Add a short `await` (with a 5 s timeout race) so we can mark `cloudflare_stream_uid` synchronously, and toast a soft warning if ingest didn't start.

### 4. Verify and adjust DB constraints / RLS once (no schema migration unless required)

- Re-confirm the `creations` RLS insert policy passes for the test barber (it requires `barber_profiles.user_id = auth.uid()`). If it doesn't, the missing-profile toast from step 1 will now surface it instead of failing silently.
- No schema migration is planned unless the captured error reveals a column/CHECK problem (e.g. `overlay_payload` rejecting non-JSON values). If it does, add a follow-up migration in the same pass.

### 5. Verification

- Record a short portfolio clip in CameraStudio → confirm new row in `creations` with `category='video'`, `media_url` reachable, and a toast that names the failure if any step breaks.
- Open `/watch` → confirm the new clip appears in the feed.
- Repeat with no `barber_profiles` row (e.g. a fan account) → confirm the explicit toast instead of a fake success.

## Files to touch

- `src/pages/CameraStudio.tsx` — error capture, category fix, toast ordering, optional awaited CF ingest.
- `src/components/profiles/PortfolioManager.tsx` — richer error toast.
- `src/components/creator/EducatorUpload.tsx` — same error-surfacing pattern.
- (Possibly) `supabase/functions/upload-to-cloudflare-stream/index.ts` — return clearer error body for the client to surface.

## Out of scope

No changes to R2 presign, no changes to RLS policies unless step 4 proves them broken, no UI redesign of the review sheet, no changes to LiveKit / battle flows.
