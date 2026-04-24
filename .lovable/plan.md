## Goal
Make live challenges behave as a self-contained **Quick Play** mini-game — votes during the live stream are session-only, decide who takes the donation pot at the end, and never affect tournament standings, category leaderboards, or barber rankings. Also fix the broken vote in the LiveKit arena, the contender→/watch redirect, and cap challenges at 15 minutes.

## Conceptual model
- **Tournament battles** (`battles.match_mode = 'tournament'`): votes count toward the official Global Championship — already isolated.
- **Quick Play live challenges** (`battles.match_mode = 'quick_play'`, created by `create-challenge-stake`): votes are **ephemeral pot votes**. They live in a NEW table `live_challenge_votes`, are tallied only for "who wins this pot," and are wiped after distribution. They never touch `battle_votes`, tournament tables, faction rank, or the user's `total_votes_cast`.

This keeps the existing tournament/voting infrastructure untouched while giving live challenges their own scoreboard.

## 1. New table: `live_challenge_votes` (migration)

```sql
create table public.live_challenge_votes (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  voter_id uuid not null,
  picked_barber_id uuid not null,   -- barber_profiles.id
  created_at timestamptz not null default now(),
  unique (battle_id, voter_id)
);
alter table public.live_challenge_votes enable row level security;

create policy "Anyone authed can read live challenge votes"
  on public.live_challenge_votes for select to authenticated using (true);

create policy "Users cast their own live challenge vote"
  on public.live_challenge_votes for insert to authenticated
  with check (auth.uid() = voter_id);

create policy "Users update their own live challenge vote"
  on public.live_challenge_votes for update to authenticated
  using (auth.uid() = voter_id) with check (auth.uid() = voter_id);

create index on public.live_challenge_votes (battle_id);
```

No tournament/category-pool triggers fire here — by design.

## 2. `src/pages/BattleTheater.tsx` — live arena uses the new table

In the **LIVE phase** action pill (the Vote B1 / heart / Vote B2 row that's currently failing):
- Detect quick-play mode: `const isQuickPlay = battle.match_mode === 'quick_play';`
- Replace the current `handleVote` call (which inserts into `battle_votes` with an empty `submission_id`) with a new `handleLiveChallengeVote(barberId)` that inserts into `live_challenge_votes` with `picked_barber_id = barber_profiles.id`. No submission lookup needed — votes attach directly to the barber.
- Show a small live tally chip on each Vote button (e.g., `Vote CJ · 12`) sourced from a 2-second-polled count query on `live_challenge_votes`.
- Add a one-line label under the action pill: *"Live pot vote — winner takes the donations"* so users understand it's separate from tournament voting.
- For non-quick-play live battles (rare), keep current behavior but require a real submission id before enabling the buttons (prevents the "Failed to cast vote" toast).

The VOD-phase 50/50 split (`battle_votes` table, with `creation1_id`/`creation2_id`) is **unchanged** — that's the post-battle official tally and continues to flow into tournament/category logic for tournament-mode battles.

## 3. `supabase/functions/distribute-pot/index.ts` — pick winner from live votes

Currently the function expects the caller to pass `winner_id`/`is_draw`. Extend it so that when called with `battle_id` and `match_mode='quick_play'` and no explicit winner, it tallies `live_challenge_votes` for that battle:
- Count votes per `picked_barber_id`.
- Highest count wins; tie → `is_draw=true`.
- Use the existing 68/15/5/10/2 (or 6/6 draw) split — pot stays the same: stakes + viewer donations.
- After distribution, **delete the rows** from `live_challenge_votes` for that battle (they were ephemeral) and mark the battle `status='completed'`.

This keeps Quick Play self-contained: pot money and pot votes live and die together.

## 4. New edge function: `end-live-challenge`

Called by the contender's "End Stream" button (or auto when the 15-min timer hits `onTimeUp`). It:
1. Verifies caller is one of the two barbers (or organizer).
2. Sets `battles.status = 'completed'` and stamps `ends_at = now()`.
3. Invokes `distribute-pot` with `{ battle_id, match_mode: 'quick_play' }` so it auto-tallies `live_challenge_votes` and pays out.
4. Returns the winner + payout summary so the UI can show a quick "🏆 CJ took the pot — 240 BB" toast before redirecting to `/watch`.

Tournament/scheduled battles continue to use the existing `complete-match` / `close-voting` flows — untouched.

## 5. Fix contender exit → `/watch` (`src/pages/ContenderTheater.tsx`)
- `handleEndStream`: call new `end-live-challenge` edge function (when `match_mode === 'quick_play'`), then `navigate('/watch', { replace: true })` inside a `try/finally` so navigation always runs.
- `onDisconnect`: track `hasGoneLiveRef = useRef(false)` set true when phase first becomes `live`. If `hasGoneLiveRef.current` is true on disconnect (with or without error), redirect to `/watch` after 300ms — independent of current `phase`.
- Add a realtime listener on the battle row: when `status` flips to `completed`/`processing`/`voting`, also `navigate('/watch', { replace: true })` as a safety net.

## 6. Cap live challenge at 15 minutes
- **Server (authoritative):** `supabase/functions/create-challenge-stake/index.ts` → `MAX_DURATION_MINUTES = 15` (was 60). The existing `Math.min` clamp handles everything.
- **Client UI:** `src/components/battles/ChallengeFeed.tsx` → both `duration_minutes: 60` literals → `15`.
- **Live arena auto-end:** when the contender enters the `live` phase, set `battles.ends_at = now() + 15 min` if missing/longer. The existing `LiveKitArena`'s `endsAt` prop already drives an `onTimeUp` callback — wire `onTimeUp` to call `end-live-challenge` so the pot auto-distributes at the 15-min mark.

## Files touched
- **New migration**: `live_challenge_votes` table + RLS
- **New edge function**: `supabase/functions/end-live-challenge/index.ts`
- **Edited edge functions**:
  - `supabase/functions/distribute-pot/index.ts` — auto-tally for quick-play
  - `supabase/functions/create-challenge-stake/index.ts` — `MAX_DURATION_MINUTES = 15`
- **Edited frontend**:
  - `src/pages/BattleTheater.tsx` — live arena vote pill writes to `live_challenge_votes`, shows live tally + "Live pot vote" label
  - `src/pages/ContenderTheater.tsx` — robust /watch redirect, 15-min `ends_at` cap, calls `end-live-challenge`
  - `src/components/battles/ChallengeFeed.tsx` — default 15 min

## Result
- **Vote works in the live arena**: tapping Vote CJ / Vote style_master inserts into `live_challenge_votes` and the button shows ✓ instead of "Failed to cast vote."
- **Pot votes are session-only**: they decide the donation pot winner at the 15-min mark (or when a barber ends early), then are wiped — they never reach `battle_votes`, tournament standings, category prize pools, or the user's `total_votes_cast`.
- **Tournament integrity preserved**: official tournament battles keep using `battle_votes` + the existing pipelines unchanged.
- **Contenders always land on /watch** when a stream ends or drops after going live.
- **Hard 15-min cap** on every challenge, enforced on both server and client, with auto-payout when the timer hits zero.