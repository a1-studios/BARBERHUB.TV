

# Fix: Direct Challenge Flow — Notification + Split-Screen Room

## Root Cause (from edge logs)

```
PGRST204: Could not find the 'battle_type' column of 'open_challenges' in the schema cache
```

`create-challenge-stake` inserts `battle_type: 'challenge'`, but that column does not exist on `open_challenges`. The INSERT fails silently → toast shows "Failed to issue challenge" → nothing else happens (no notification, no battle room).

Verified columns on `open_challenges`: `id, challenger_id, challenger_username, title, challenger_stream_url, status, accepted_by_id, accepted_at, battle_id, stake_amount, opponent_stake_matched, pot_total, donations_total, target_barber_id, duration_minutes, expires_at, …` — **no `battle_type`**.

Two more gaps surfaced:
1. **No notification for the targeted barber** when a Direct Challenge is issued. The target has no way to know.
2. **Acceptance path doesn't wire the battle** — `match-challenge-stake` updates the challenge but never sets `barber1_id`/`barber2_id` or flips `battles.status`, so neither party is routed into the split-screen `ContenderTheater`.

## Fix Plan

### 1. `create-challenge-stake/index.ts`
- **Remove** `battle_type: 'challenge'` from the `open_challenges` insert (column doesn't exist; the `battles` row already carries `battle_type`).
- After the challenge row is created, if `target_barber_id` is set, insert a **notification** for that user:
  ```
  type: 'challenge_received'
  title: '⚔️ You've Been Challenged!'
  message: '{challenger} challenged you to {title}'
  data: { challenge_id, battle_id, challenger_id, stake_amount }
  ```
- Also resolve the challenger's `barber_profiles.id` and write it into `battles.barber1_id` so the split-screen has the challenger pre-seated.

### 2. `match-challenge-stake/index.ts`
- After updating the challenge to `accepted`, resolve the acceptor's `barber_profiles.id` and `UPDATE battles SET barber2_id = <acceptor>, status = 'live' WHERE id = challenge.battle_id`.
- Return `battle_id` (already does) so the client can navigate.
- The existing `challenge_accepted` notification to the challenger already exists — extend it with `battle_id` so the deep-link works.

### 3. Client navigation — `ChallengeModal.tsx` (issuer side)
- After `create-challenge-stake` succeeds and returns `challenge` (which has `battle_id`), navigate the challenger directly into the staging room: `navigate('/battle/' + challenge.battle_id + '/contender')`.
- Close the modal.

### 4. Client navigation — `AcceptChallengeModal.tsx` (acceptor side)
- After `match-challenge-stake` succeeds, navigate to `/battle/{battle_id}/contender`.

### 5. Notification deep-link — `NotificationPanel.tsx`
- For `challenge_received` notifications, clicking opens an Accept/Decline sheet (reuse `AcceptChallengeModal`) preloaded with the challenge.
- For `challenge_accepted`, clicking navigates to `/battle/{battle_id}/contender`.

### 6. Realtime trigger
- `notifications` table is already in `supabase_realtime` (per `useNotifications`). Target barber will get the toast + badge instantly via existing realtime subscription — no schema changes needed.

## File Plan

| File | Change |
|------|--------|
| `supabase/functions/create-challenge-stake/index.ts` | Remove `battle_type` from insert; add `challenge_received` notification for `target_barber_id`; set `battles.barber1_id` to challenger's barber_profiles.id |
| `supabase/functions/match-challenge-stake/index.ts` | Set `battles.barber2_id` + `status='live'` on accept; include `battle_id` in notification payload |
| `src/components/battles/ChallengeModal.tsx` | After success, `navigate('/battle/{battle_id}/contender')` and close modal |
| `src/components/battles/AcceptChallengeModal.tsx` | After accept, navigate to `/battle/{battle_id}/contender` |
| `src/components/NotificationPanel.tsx` | Wire click handlers for `challenge_received` (open Accept modal) and `challenge_accepted` (navigate to contender room) |

## What this delivers
- **Issuer taps "Challenge cj"** → toast success → instantly dropped into the split-screen Contender Theater (waiting for opponent).
- **Target barber (cj)** → realtime notification pops up: *"⚔️ You've Been Challenged!"* → tap → Accept modal → on accept → joins the same split-screen room.
- **Both barbers in `ContenderTheater`** → existing readiness/standby/live state machine takes over (already implemented per `mem://features/contender-theater-livekit`).

