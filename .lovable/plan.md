

## Goal
Once a Quick Play challenge starts (both barbers live in split-screen), all the "open challenge" UI traces — challenge cards in the feed, notification entries, the open_challenges row, and challenger widgets — must vanish. Viewers only see the two barbers live in the split-screen room.

## Root cause of clutter
- `open_challenges` rows stay `pending`/`accepted` after the battle goes live → still appear in `ChallengeFeed`
- `challenge_received` / `challenge_accepted` notifications stay in the bell after the challenge resolves
- Open challenge widgets (`OpenChallengeQueue`, `ChallengerFoundOverlay`) keep polling the row

## Fix Plan

### 1. Edge function — `match-challenge-stake` (when opponent accepts)
After the battle is created and `barber2_id` is written:
- `update open_challenges set status='matched', matched_at=now(), expires_at=now() where id = challenge_id` — flips it out of any "open" filter
- Delete (or mark `read=true` + `dismissed=true`) all notifications where `data->>'challenge_id' = challenge_id` for both challenger + target. Use a soft delete: `update notifications set read=true, dismissed_at=now() where ...` so audit trail remains but UI hides them.
- Insert a single transient `challenge_live` notification routed to `/battle/{id}/contender` for the challenger only — auto-dismissed once they're in the room.

### 2. Edge function — new `expire-quick-play-challenge` (or extend `cleanup-expired-challenges`)
Triggered when the battle status flips to `live` OR when `match-challenge-stake` runs:
- Same dismissal logic for any leftover challenge artifacts.
- Hard-delete `open_challenges` row 60s after `matched_at` (cron job already exists in `cleanup-expired-challenges` — add a `quick_play` branch).

### 3. Edge function — `create-challenge-stake` (decline / timeout path)
On decline (already added in `AcceptChallengeModal`) or expiry:
- Dismiss the `challenge_received` notification on the target's bell
- Dismiss `challenge_sent` notification on the challenger's side
- Insert a brief `challenge_declined` toast notification → auto-dismiss after view

### 4. Frontend — `ChallengeFeed.tsx`
Filter query: only show `open_challenges` where `status = 'pending'` AND `expires_at > now()` AND `match_mode = 'quick_play'`. Today it likely shows `accepted`/`matched` too.

### 5. Frontend — `NotificationPanel.tsx`
- Hide notifications where `dismissed_at IS NOT NULL`
- Hide `challenge_received` rows whose `open_challenges.status != 'pending'` (the row was already accepted/declined elsewhere — stale notification)

### 6. Frontend — `BattleTheater.tsx` (viewer experience)
Verify the spectator view shows only the two barbers' live tracks once `battle.status = 'live'` — no challenge widgets, no "open challenge" CTA, no challenger overlay. Hide `OpenChallengeQueue` / `ChallengerFoundOverlay` when `battle.status IN ('live','voting','completed')`.

### 7. DB migration
Add `notifications.dismissed_at timestamptz` (nullable) for soft-dismissal. Add index `notifications(user_id, dismissed_at) WHERE dismissed_at IS NULL`.

## Files

| File | Change |
|------|--------|
| **Migration** | Add `notifications.dismissed_at` + partial index |
| `supabase/functions/match-challenge-stake/index.ts` | On accept: mark challenge `matched`, soft-dismiss related notifications, insert single `challenge_live` ping |
| `supabase/functions/cleanup-expired-challenges/index.ts` | Add Quick Play branch: hard-delete matched challenges after 60s; dismiss orphaned notifications |
| `supabase/functions/create-challenge-stake/index.ts` | (already deployed) — verify it inserts only the single `challenge_received` notification, no extras |
| `src/components/battles/AcceptChallengeModal.tsx` | On decline: also soft-dismiss the notification + dismiss challenger's `challenge_sent` |
| `src/components/battles/ChallengeFeed.tsx` | Filter: `status='pending' AND expires_at > now() AND match_mode='quick_play'` |
| `src/components/NotificationPanel.tsx` | Hide rows where `dismissed_at IS NOT NULL`; refresh on realtime UPDATE |
| `src/hooks/useNotifications.tsx` | Subscribe to UPDATE events too (currently only INSERT) so dismissals propagate live |
| `src/pages/BattleTheater.tsx` | Hide all challenge widgets when `battle.status IN ('live','voting','completed')` — viewers see only the two barbers' video |

## Result
- Acceptor taps Accept → `match-challenge-stake` runs → challenge row → `matched`, all related notification bells clear instantly across both users → both land in `/battle/{id}/contender`.
- Viewers opening `/battle/{id}` (theater) see only the two barbers in split-screen — zero challenge UI residue.
- 60s after the match, the `open_challenges` row is hard-deleted by the existing cron, so no zombie data remains.

