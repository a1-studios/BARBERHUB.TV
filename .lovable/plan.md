

## Unified AAA Tournament Infrastructure — Full Implementation Plan

This merges the revised payout logic (2-week hold, draw support) with the broader tournament upgrade (SMS, Data Channels, multipart upload, etc.) into a single execution order.

---

### Phase 1: Database Foundation (Migration)

Single migration covering all schema changes:

**a) `pending_payouts` table:**
```sql
CREATE TABLE pending_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount_bb INTEGER NOT NULL,
  battle_id UUID,
  challenge_id UUID,
  payout_type TEXT NOT NULL,  -- 'battle_winner','battle_loser','battle_draw'
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_release_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
RLS: users SELECT own rows. Service role full access.

**b) Add `show_up_points INTEGER DEFAULT 0` to `tournament_standings`.**

**c) RPCs (all `SECURITY DEFINER`, `FOR UPDATE` locks):**

- `deduct_queue_entry_fee(p_user_id, p_category, p_amount_bb)` — standalone refactor from `register-tournament-bb` inline logic
- `award_show_up_point(p_barber_profile_id, p_battle_id)` — idempotent +1 show-up point for tournament matches
- `finalize_vod_prize_split(p_battle_id, p_winner_id, p_loser_id, p_is_draw)` — called by `close-voting` after 7-day vote; awards +2 season points to winner (or +1 each on draw)

---

### Phase 2: Rewrite `distribute-pot` (Delayed Payout)

Replace current instant-credit logic with the new split:

```text
Winner: 10%  → pending_payouts (14-day hold)
Loser:   2%  → pending_payouts (14-day hold)
Platform:15% → platform_transactions (immediate)
M4M:     5%  → m4m_fund_ledger (immediate)
Prize:  68%  → category_prize_pools (immediate)

DRAW: 6% each barber → pending_payouts
```

- Accept `winner_id` (nullable), `loser_id`, `is_draw` boolean
- Insert into `pending_payouts` with `scheduled_release_at = NOW() + 14 days`
- Log `barber_bucks_transactions` with type `payout_pending`
- Notify both barbers with release date

---

### Phase 3: `release-pending-payouts` Edge Function + pg_cron

- Query `pending_payouts WHERE status='pending' AND scheduled_release_at <= NOW()`
- `FOR UPDATE` lock on `profiles.barber_bucks`, credit amount, mark `released`
- Insert `barber_bucks_transactions` type `payout_released`
- Notify barber
- Schedule daily at 6am UTC via `cron.schedule`

---

### Phase 4: Update `close-voting`

After `calculate_match_result`:
- Detect draw: if `winner_id` is null or vote margin < 1%
- Call `distribute-pot` with `winner_id`, `loser_id`, `is_draw`
- Call `finalize_vod_prize_split` RPC for season points

---

### Phase 5: UI — Draw + Pending Payout

**BattleResults.tsx:** Show "Draw" badge when no winner. Show "Payout Pending — releases in X days" for both barbers.

**BattleResultsView.tsx:** When `winner === 'tie'`, render both barbers equally (no crown). Show pending payout countdown.

---

### Phase 6: Admin Matchmaking + SMS

- **TournamentQueuePanel:** Add "Execute Match" button that calls matchmaker then `send-match-sms`
- **`send-match-sms` edge function:** Twilio gateway call to both barbers' phone numbers (requires Twilio connector — will prompt during implementation)
- **ChallengerFoundOverlay:** Full-screen cinematic triggered by Realtime notification `type = 'battle_match'`

---

### Phase 7: LiveKit Data Channel Donation Meter

- **Server:** In `process-bb-donation`, use `RoomServiceClient.sendData()` to broadcast donation JSON to room
- **Client:** `TugOfWarMeter` component listening on `RoomEvent.DataReceived`, animated ratio bar

---

### Phase 8: Season Points on Room Join

- In `generate-livekit-token`, after token creation for tournament match, call `award_show_up_point` RPC

---

### Phase 9: Battle End Phase Transition

- **`close-battle-room` edge function:** pg_cron triggers when `ends_at <= NOW()` and `status = 'live'`. Stops egress, deletes room, sets `status = 'processing'`
- **ProcessingArena component:** "Generating Replay..." overlay with Realtime subscription watching for `processing` → `voting`
- **`livekit-egress-webhook` update:** Handle `processing` → `voting` transition

---

### Phase 10: S3 Multipart Chunked Upload

Three edge functions: `initiate-multipart-upload`, `presign-upload-part`, `complete-multipart-upload` — all using `@aws-sdk/client-s3` against R2.

Client in `VideoSubmissionModal`: 5MB chunks, 4 parallel uploads, progress tracking.

---

### Phase 11: Enhanced VOD Playback

- Tap-to-isolate audio per barber side in split-screen
- Viewport-based autoplay via `IntersectionObserver`, max 3 active DOM videos

---

### Execution Order

| Priority | Phase | Dependencies |
|----------|-------|-------------|
| 1 | Phase 1 (Migration) | None |
| 2 | Phase 2-3-4-5 (Payout) | Phase 1 |
| 3 | Phase 6 (SMS) | Twilio connector |
| 3 | Phase 7 (Data Channel) | None |
| 3 | Phase 8 (Show-up points) | Phase 1 |
| 4 | Phase 9 (Processing) | Phase 2 |
| 5 | Phase 10-11 (Upload/Playback) | None |

### Files Summary

| Action | File |
|--------|------|
| Migration | `pending_payouts` table, `show_up_points` column, 4 RPCs |
| Rewrite | `supabase/functions/distribute-pot/index.ts` |
| Create | `supabase/functions/release-pending-payouts/index.ts` |
| Create | `supabase/functions/send-match-sms/index.ts` |
| Create | `supabase/functions/close-battle-room/index.ts` |
| Create | `supabase/functions/initiate-multipart-upload/index.ts` |
| Create | `supabase/functions/presign-upload-part/index.ts` |
| Create | `supabase/functions/complete-multipart-upload/index.ts` |
| Create | `src/components/battles/ChallengerFoundOverlay.tsx` |
| Create | `src/components/battles/TugOfWarMeter.tsx` |
| Create | `src/components/battles/ProcessingArena.tsx` |
| Update | `supabase/functions/close-voting/index.ts` |
| Update | `src/components/battles/BattleResults.tsx` |
| Update | `src/components/battles/BattleResultsView.tsx` |
| Update | `src/components/sovereign/TournamentQueuePanel.tsx` |
| Update | `src/pages/BattleTheater.tsx` |
| Update | `src/components/battles/VideoSubmissionModal.tsx` |
| Update | `supabase/functions/generate-livekit-token/index.ts` |
| Update | `supabase/functions/process-bb-donation/index.ts` |
| Update | `supabase/functions/livekit-egress-webhook/index.ts` |

