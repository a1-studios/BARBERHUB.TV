
# Challenge path — audit findings & fix plan

After tracing the full flow (`ChallengeModal` / `ChallengeFeed` → `create-challenge-stake` → `notifications` → `IncomingChallengeTakeover` → `match-challenge-stake` → `ContenderTheater`), four real bugs are breaking the path. Plan fixes only those.

## Bugs found

1. **Direct (targeted) challenges leak into the public feed.**
   `ChallengeFeed` queries `open_challenges` with no filter on `target_barber_id`, so a challenge meant for one specific barber shows up in everyone's "Open Challenges" list and any barber can accept it.

2. **`match-challenge-stake` doesn't honor `target_barber_id`.**
   The edge function checks status/expiry/self-acceptance but never verifies the acceptor matches the targeted barber. Combined with bug #1, the wrong barber can hijack a direct challenge.

3. **Challenger stuck waiting — never sees opponent arrive.**
   `ContenderTheater` fetches `battles` with a single `useQuery` and has no realtime subscription. When the opponent accepts, `battles.barber2_id` + `status='live'` update server-side, but the challenger's client never refetches → `opponentIdentity` stays `null` → LiveKit never matches the new participant, screen stays in standby forever.

4. **Acceptor with no `barber_profiles` row breaks positioning.**
   `match-challenge-stake` does `barber2_id: acceptorBarberProfile?.id ?? null`. If the accepter is a barber-role user whose `barber_profiles` row hasn't been created yet, `barber2_id` stays `null`, `ContenderTheater` can't set `barberPosition=2`, and the accepter is silently treated as a viewer.

## Fix plan

### A. Frontend — `src/components/battles/ChallengeFeed.tsx`
- Add `useAuth` and filter the `open-challenges` query so each barber sees:
  - their own challenges, plus
  - non-targeted challenges (`target_barber_id is null`), plus
  - challenges targeted at them (`target_barber_id = user.id`).
- Implementation: `.or('target_barber_id.is.null,target_barber_id.eq.<uid>,challenger_id.eq.<uid>')`.

### B. Frontend — `src/pages/ContenderTheater.tsx`
- Add a Supabase realtime subscription on `battles` filtered by `id=eq.<battleId>` that calls `queryClient.invalidateQueries(['battle-contender', battleId])` on any UPDATE.
- This wakes the challenger as soon as `barber2_id` / `status` flip, so `opponentIdentity` resolves and LiveKit pairing fires.

### C. Edge function — `supabase/functions/match-challenge-stake/index.ts`
- After loading `challenge`, if `challenge.target_barber_id` is set and `target_barber_id !== user.id`, return `403 "This challenge was issued to a different barber"`.
- Guarantee `barber2_id` is non-null: if `acceptorBarberProfile` is missing, create a minimal `barber_profiles` row for the user, then use that id. Falls back to existing id if found.

### D. Edge function — `supabase/functions/create-challenge-stake/index.ts`
- Same `barber_profiles` guarantee for the challenger so `barber1_id` is never null when challenger lands in `ContenderTheater`.

## Out of scope (not touched)
- LiveKit signaling, single-stream solo broadcast (working per user), Lives modal, prize ticker, faction banners, tournament/ranking logic, BB economy splits, notification panel UI.

## Verification
- Issue direct challenge from A → B: only B sees it in feed; C cannot accept (server rejects).
- B accepts → challenger A's ContenderTheater leaves standby and pairs with B within ~1s.
- Repeat with an account that has no `barber_profiles` row → both contenders still get positions 1/2.
- Open Quick Play preset (no target) still appears for every barber and any can accept.

