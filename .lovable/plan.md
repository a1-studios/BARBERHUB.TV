# Fix: "Access Denied" in Contender Theater after a barber-to-barber challenge

## Root cause

`battles.barber1_id` and `battles.barber2_id` are foreign keys to **`barber_profiles.id`**, not `auth.users.id`. The two challenge edge functions disagree on what they write:

- `supabase/functions/create-challenge-stake/index.ts` (challenger side) correctly resolves the challenger's `barber_profiles.id` (creating the row if missing) and writes it to `barber1_id`.
- `supabase/functions/complete-open-challenge/index.ts` (accepter side) writes `barber2_id: user.id` — the **auth user id**, not the `barber_profiles.id`.

Consequences in `src/pages/ContenderTheater.tsx` (lines ~118–138):
- It loads `barber_profiles` rows whose `id IN (barber1_id, barber2_id)`. The accepter's auth-uid never matches a `barber_profiles.id`, so no row comes back for slot 2.
- The matcher `barber.user_id === user.id` therefore never sets `barberPosition` for the accepter.
- The only fallback is `battle.organizer_id === user.id`, which is true only for the challenger.
- Accepter falls through to the **Access Denied** screen at line 288.

Side effect: `useBattleVideoRoom` derives `opponentIdentity` from `battle.barber2_id`. With the wrong value stored, LiveKit identity matching also misbehaves once both sides connect.

## Fix

Single edge-function change — no DB migration, no frontend changes.

### `supabase/functions/complete-open-challenge/index.ts`

1. Before updating the battle, resolve the accepter's `barber_profiles.id`, mirroring the pattern already in `create-challenge-stake`:
   - `select id from barber_profiles where user_id = user.id`
   - If missing, insert a row with `{ user_id: user.id, name: accepterUsername }` and use the new id.
2. Use that id when updating the battle:
   ```ts
   barber2_id: accepterBarberProfileId
   ```
3. Keep everything else (status flip to `voting`, challenge update, notification, prize-pool counter) unchanged.
4. If the lookup/insert fails, return a clear 400 ("Could not prepare your barber profile") and do **not** mutate the battle or challenge rows.

## Verification

- Challenger A issues a direct challenge to Barber B from `ChallengeModal`.
- B taps the `challenge_received` notification and accepts via `AcceptChallengeModal` → `complete-open-challenge`.
- B is routed to `/battle/:id/contender` and lands in the Contender Theater as **barber2** (no Access Denied).
- `battles.barber2_id` equals B's `barber_profiles.id`; `useBattleVideoRoom` sees the correct opponent identity and the live PK proceeds.

## Out of scope

- No schema changes; existing battles created with the bug remain malformed but new flows are correct.
- The `ContenderTheater` organizer fallback stays as a safety net for the challenger before their `barber_profiles` row is queryable.
