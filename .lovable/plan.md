## What's actually happening

Your video uploads ARE working. The file lands in R2, the `creations` row gets inserted, and the Cloudflare Stream ingest is called. I verified this in the edge function logs — `[overlay] received payload for creations/541701c6-…` proves the insert returned a real ID.

But the `creations` table tells a different story:

- Last surviving row: **May 9** (nothing since)
- pg_stat counters: **30 inserts, 27 deletes, 3 live rows**

So every recent upload is being **deleted shortly after** it's saved. That's why the upload feels "super quick" but the video never appears anywhere.

## Root cause

`public.creations.barber_id` has `ON DELETE CASCADE` to `barber_profiles`. The RPC `sync_user_binary_role(user_id, role)` — called by the edge function `finalize-oauth-claim` — contains this:

```text
IF p_role = 'barber' THEN  …keep barber_profiles…
ELSE
  …
  DELETE FROM public.barber_profiles WHERE user_id = p_user_id;
END IF;
```

`finalize-oauth-claim` is invoked by `ProfileCompletionGate` (and any onboarding re-run) whenever a user re-confirms their role. If a barber ever lands in that flow and the gate sends `role: 'fan'` (or the user toggles, or it's re-fired after a session refresh that read a stale `user_type`), their `barber_profiles` row is dropped — and `creations` cascades with it. Same path also nukes the freshly inserted upload before Cloudflare Stream ever finishes its async copy.

Counter from `pg_stat_user_tables`: barber_profiles also shows **13 deletes for 22 inserts** — matches the pattern.

## Fix plan (no functional change to the signup flow)

1. **Stop the destructive cascade.** Change `creations.barber_id` FK from `ON DELETE CASCADE` to `ON DELETE RESTRICT` (or `SET NULL` if we want orphans), so a stray role-sync can never wipe a barber's portfolio. Apply the same to `creator_content.creator_id`, `battle_submissions`, and any other media tables FK'd to barber/profile rows.

2. **Make `sync_user_binary_role` non-destructive.** Replace the `DELETE FROM barber_profiles` / `DELETE FROM client_profiles` lines with a soft flag (e.g., set `is_active=false` or `archived_at=now()`), or skip the delete entirely when the opposite-role profile already has child records (portfolio, submissions, bookings). Update RLS/queries to filter on the active flag.

3. **Harden `finalize-oauth-claim` against re-entry.** Short-circuit when the user already has the same role locked in — never re-call the RPC if `profiles.user_type` already matches the requested role. This prevents accidental role flips from re-confirmations.

4. **CameraStudio publish flow safety net.** After the CF Stream invoke, re-query the just-inserted row by ID; if it's gone, surface a clear error toast ("Your barber profile was reset — please re-pick role") instead of the current silent "Video published!" success.

5. **One-time backfill (optional).** Recover the orphaned R2 objects: list `r2://…/portfolios/*_studio.*` keys newer than May 9, match owners by upload-time logs, and re-insert `creations` rows for any user who still has a `barber_profiles` row.

## Files / objects touched

- `supabase/migrations/*` — FK constraint changes on `creations`, `creator_content`, `battle_submissions`; update `sync_user_binary_role` to soft-archive instead of delete.
- `supabase/functions/finalize-oauth-claim/index.ts` — idempotency guard.
- `src/pages/CameraStudio.tsx` — post-insert verification + clearer error.
- Any query that reads `barber_profiles` — add `where archived_at is null` filter (if we go the soft-delete route).

## Verification

After applying:
- Upload a video → confirm row stays in `creations` after 60s
- Re-open `ProfileCompletionGate` and resubmit role → barber's portfolio remains intact
- `pg_stat_user_tables.creations.n_tup_del` stops climbing during normal use