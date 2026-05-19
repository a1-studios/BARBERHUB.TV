## Goal
Make sure existing media benefits from the new CDN (`https://media.barberhub.tv`) — not just new uploads — so playback is fast everywhere.

## Audit findings
Scanned every URL column across `battle_submissions`, `battles`, `creations`, `creator_content`, `stream_sessions`. Only one table has legacy rows:

- `creations.media_url` — 5 rows pointing at the old R2 public host `https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev/...`
- All other media URL columns (`battles.barber_1/2_video_url`, `battle_submissions.media_url/thumbnail_url`, `creations.thumbnail_url`, `creator_content.*`, `stream_sessions.recording_url`) are empty — no rewrite needed.
- Avatar URLs live on Supabase Storage, not R2 — out of scope.

## Plan
Single SQL migration that swaps the legacy R2 host for the CDN host on `creations.media_url`. Object keys (`portfolios/...`) stay identical, so the CDN resolves to the same R2 object via the existing bucket binding — no re-upload, no broken links.

```sql
UPDATE public.creations
SET media_url = replace(
  media_url,
  'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev',
  'https://media.barberhub.tv'
)
WHERE media_url LIKE 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev/%';
```

A defensive pass for the other columns is included as no-ops (zero rows match today, but cheap insurance if rows appear before the migration runs):

```sql
UPDATE public.battle_submissions SET media_url = replace(media_url, 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev', 'https://media.barberhub.tv') WHERE media_url LIKE 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev/%';
UPDATE public.battle_submissions SET thumbnail_url = replace(thumbnail_url, 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev', 'https://media.barberhub.tv') WHERE thumbnail_url LIKE 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev/%';
UPDATE public.battles SET barber_1_video_url = replace(barber_1_video_url, 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev', 'https://media.barberhub.tv') WHERE barber_1_video_url LIKE 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev/%';
UPDATE public.battles SET barber_2_video_url = replace(barber_2_video_url, 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev', 'https://media.barberhub.tv') WHERE barber_2_video_url LIKE 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev/%';
UPDATE public.creator_content SET media_url = replace(media_url, 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev', 'https://media.barberhub.tv') WHERE media_url LIKE 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev/%';
UPDATE public.creator_content SET thumbnail_url = replace(thumbnail_url, 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev', 'https://media.barberhub.tv') WHERE thumbnail_url LIKE 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev/%';
UPDATE public.stream_sessions SET recording_url = replace(recording_url, 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev', 'https://media.barberhub.tv') WHERE recording_url LIKE 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev/%';
UPDATE public.creations SET thumbnail_url = replace(thumbnail_url, 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev', 'https://media.barberhub.tv') WHERE thumbnail_url LIKE 'https://pub-a2131dfd73414e58b65fe559949bf93a.r2.dev/%';
```

## Prerequisite (you, one-time in Cloudflare)
For the rewritten URLs to resolve, the `media.barberhub.tv` custom domain must be bound to the same R2 bucket that holds the `portfolios/*` and future `recordings/*` keys (bucket `battles-submissions` per the edge functions). If that binding is already in place — which the new-upload flow proves — nothing else to do.

## Verification
1. Run the migration.
2. Re-query: zero rows should still match the old host.
3. Open a barber profile that has a portfolio clip and confirm playback (DevTools Network → request goes to `media.barberhub.tv` and returns 200 with `cf-cache-status`).
4. Spot-check a watch-feed clip.

## Out of scope
Frontend code, edge function code, R2 upload path, Cloudflare Stream HLS URLs (those are `videodelivery.net` and unaffected), avatar/Supabase Storage URLs.
