## Goal
Unblock `battles` UPDATEs so `match-challenge-stake` can seat `barber2_id` and the accepter lands in the contender room.

## Root cause
Edge function logs show every accept failing with Postgres error `42P10`:
> cannot update table "battles" — Column list used by the publication does not cover the replica identity.

`public.battles` has `REPLICA IDENTITY FULL` but is added to publication `supabase_realtime` with an explicit column list. With FULL identity, Postgres requires the publication to cover **all** columns. New columns added to `battles` over time aren't in that column list, so every UPDATE (including `barber2_id`/`status`) is rejected at the storage layer — before RLS even runs. The service-role client in the edge function can't bypass this; it's not an auth issue.

## RLS audit (no changes needed)
- `battles` SELECT — `auth.uid() IS NOT NULL` ✅ accepter can read seated battle
- `open_challenges` SELECT — allows `auth.uid() = accepted_by_id` ✅
- `barber_profiles` SELECT — all authenticated users ✅
- Mutations on `battles` go through edge function with service role, which is correct.

No RLS change required for the accept flow.

## Plan
1. **Migration**: re-add `public.battles` to `supabase_realtime` without a column list so the publication automatically covers every column, satisfying `REPLICA IDENTITY FULL`.
   ```sql
   ALTER PUBLICATION supabase_realtime DROP TABLE public.battles;
   ALTER PUBLICATION supabase_realtime ADD TABLE public.battles;
   ```
   This preserves realtime on `battles` (used by Contender Theater / tug-of-war) and clears the 42P10 block.

2. **Verify**: after migration, re-run an accept from the preview (logged-in barber) and confirm:
   - `match-challenge-stake` returns 200
   - `battles.barber2_id` = acceptor's `barber_profiles.id`
   - `battles.status = 'live'`
   - Contender Theater loads without Access Denied

3. **No code changes** to `match-challenge-stake/index.ts` or `ContenderTheater.tsx` — the hardening from previous turns is correct; it was just hitting a storage-layer error masked as "battle wire-up failed".

## Files
- New migration only. No app code changes.
