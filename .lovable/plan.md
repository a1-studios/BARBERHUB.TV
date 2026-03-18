# BARBER-HUB Anti-Gravity System Audit

A full-stack audit of the platform's automation layer, economy, M4M fund, battle/tournament lifecycle, and streaming infrastructure. This identifies every gap, contradiction, and missing "agent" (automated process) needed to make the system production-ready.

---

## SECTION 1: ECONOMY (Barber Bucks) — Gaps & Contradictions

### 1A. `donate-to-battle` Edge Function Bypasses the 80/15/5 Split

**Finding:** The `donate-to-battle` edge function does a simple flat transfer — deducts BB from the donor, records it in `battle_donations`, and optionally adds to `open_challenges.pot_total`. It does **NOT** call `process_battle_donation` RPC and does **NOT** route money through the 80/15/5 split (80% category pool, 15% barber wallet, 5% M4M fund).

Meanwhile, `DonationModal.tsx` on the frontend correctly calls `supabase.rpc('process_battle_donation')` for battle donations. So there are **two competing donation pathways** — the edge function is dead/wrong code.

**Fix needed:** Either remove the `donate-to-battle` edge function entirely (since the RPC handles it), or rewrite it to call the RPC internally. The frontend is correct; the edge function is orphaned.

**Fix needed:** Add 5% platform fee on all transactions 3% for mm and 2% for barberhub

### 1C. `distribute-pot` Uses a Flat 5% Fee, Not the 80/15/5 Split

**Finding:** When a challenge battle ends, `distribute-pot` gives 95% to the winner and 5% as platform fee. It does **not** route anything to the M4M fund or category prize pool. This contradicts the "Official Law" of the economy.

**Fix needed:** `distribute-pot` must apply the 80/15/5 split for official-category challenge pots, or at minimum route 5% to M4M. For non-official categories, the current flat 5% may be acceptable. the amount of each pot/category should grown as users donate to thru the tournament and we should the amount just dynamicly display in bb. and should be no payout yet there will be finalist that then will compete in a final match.

### 1D. No Race Condition Protection on Balance Updates

**Finding:** Multiple edge functions (`donate-to-battle`, `process-bb-donation`, `spin-wheel`) use a read-then-write pattern: `SELECT barber_bucks → calculate → UPDATE barber_bucks`. Without `FOR UPDATE` row locks, concurrent requests can cause double-spending. Only `process_battle_donation` RPC uses `FOR UPDATE` correctly.

**Fix needed:** All BB-mutating edge functions should either use `FOR UPDATE` locks or delegate to a single atomic RPC.

### 1E. `useBarberBucks.deductBucks` Is Client-Side — Insecure

**Finding:** The `deductBucks` mutation in `useBarberBucks.tsx` directly updates `profiles.barber_bucks` from the client. Any user can manipulate the amount. This should only be done server-side.

**Fix needed:** Remove client-side balance mutation. All deductions must go through edge functions or RPCs with server-side validation.

---

## SECTION 2: M4M (Minutes for Men) Fund — Gaps

### 2A. M4M Fund Ledger Has No Reporting or Withdrawal Mechanism

**Finding:** The `m4m_fund_ledger` table records deposits from `process_battle_donation`, but:

- No edge function or admin panel to view total M4M fund balance
- No withdrawal/disbursement mechanism
- No Sovereign HQ panel to manage M4M allocations
- `VaultMetricsPanel` doesn't surface M4M fund totals

**Fix needed:** Add an `m4m-fund-summary` RPC that aggregates `SUM(amount_bb)` from the ledger. Surface this in Sovereign HQ. Create a disbursement edge function for admin-initiated transfers.

### 2B. M4M Session Verification Is Disconnected from Economy

**Finding:** `verify_m4m_session` RPC increments `m4m_lives_touched` on the barber profile, but this count has no economic impact — no BB reward, no badge unlock, no leaderboard weighting. The M4M certification (`m4m_certified`, `m4m_paid`) flags exist but aren't enforced or rewarded anywhere.

**Fix needed:** Define the M4M reward loop: Does touching X lives unlock a badge? Does it contribute to tournament seeding? This is a design decision, not a code fix.

---

## SECTION 3: BATTLE / TOURNAMENT LIFECYCLE — Gaps

### 3A. `submit-battle-video` Still Validates YouTube URLs Only

**Finding:** The function has a hardcoded `youtubeRegex` check — it will reject any non-YouTube URL. Given the pivot to AWS IVS (HLS playback URLs), this function will reject all IVS-sourced video submissions.

**Fix needed:** Replace the YouTube URL regex with a more permissive validator that accepts HLS URLs (`*.m3u8`), S3 URLs, or remove URL format validation entirely and validate by content-type or URL accessibility.

### 3B. `sync-battle-viewers` Still Uses YouTube Data API

**Finding:** This edge function fetches `concurrentViewers` from the YouTube Data API v3. With the pivot to AWS IVS, this function is dead code. It's running on a cron schedule, burning YouTube API quota on empty results.

**Fix needed:** Rewrite to fetch viewer counts from AWS IVS `GetStream` API, or from the Twilio room participant count (for Twilio battles). Remove the YouTube API dependency.

### 3C. `check-youtube-live` Edge Function Is Obsolete

**Finding:** This function exists in the functions directory but is a YouTube-specific liveness checker. It should be removed or replaced with an IVS channel status checker.

### 3D. No AWS IVS Edge Functions Exist Yet

**Finding:** The `battles` table has `ivs_channel_arn`, `ivs_playback_url`, and `ivs_stream_key` columns, but there are **zero edge functions** to:

- Create an IVS channel for a battle
- Generate ingest credentials for a barber
- Fetch IVS stream status (live/offline)
- Get recording/VOD URLs after a stream ends

**Fix needed (new edge functions):**

1. `create-ivs-channel` — Creates an AWS IVS channel per battle, stores ARN/key/playback URL
2. `get-ivs-credentials` — Returns ingest server + stream key to the barber client
3. `ivs-stream-status` — Polls or receives webhook for stream online/offline events
4. `ivs-recording-complete` — Webhook handler for IVS auto-record → S3, stores VOD URL

**Secrets needed:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (none are currently configured).

### 3E. `start-live-stream` Sets Status to `voting` — Wrong

**Finding:** The `start-live-stream` edge function updates battle status to `'voting'` when a stream starts. This is semantically wrong — a live stream starting should set status to `'live'` or `'active'`, not `'voting'`. Voting should begin after the stream ends.

**Fix needed:** Change the status update from `'voting'` to `'live'` or `'active'`.

### 3F. `tournament-matchmaker` Creates Battles with `barber1_id` / `barber2_id` as `user_id` — FK Mismatch

**Finding:** The matchmaker sets `barber1_id: barber1.user_id` and `barber2_id: barber2.user_id`. But `battles.barber1_id` has a FK to `barber_profiles.id` (the barber profile UUID), NOT `profiles.user_id`. This means the matchmaker is writing invalid foreign key references.

**Fix needed:** Use `barber1.barber_profile_id` instead of `barber1.user_id` for the battle's `barber1_id` / `barber2_id` fields.

### 3G. No Automatic Pot Distribution on Battle Completion

**Finding:** When `auto-close-voting` or `close-voting` marks a battle as completed, neither function triggers `distribute-pot`. The pot sits in the `open_challenges` or `battle_donations` tables indefinitely. There is no automated agent to disburse winnings.

**Fix needed:** After setting status to `'completed'` and determining the winner, `auto-close-voting` should invoke `distribute-pot` (or an equivalent inline RPC) to pay out the winner and apply the 80/15/5 split.

### 3H. `complete-match` Uses Anon Key — Not Service Role

**Finding:** `complete-match` creates a Supabase client with `SUPABASE_ANON_KEY`, meaning it operates under RLS as the calling user. If the barber doesn't have permission to update battle status, this will silently fail. Should use service role for administrative state transitions.

---

## SECTION 4: STREAMING INFRASTRUCTURE — Twilio + AWS IVS

### 4A. Twilio Is Functional But Limited to 50 Viewers

**Finding:** `create-twilio-room` sets `MaxParticipants: '50'`. Twilio Video group rooms support up to 50 participants total (including the 2 barbers), meaning max 48 viewers per battle. For a global competition platform, this is a hard ceiling.

**Fix needed:** For scale, Twilio should be used only for the barber-to-barber connection (private room, 2 participants). Viewer distribution should go through:

- AWS IVS for low-latency broadcast to unlimited viewers
- Or Twilio Live (different product, supports thousands)

### 4B. No Twilio-to-IVS Bridge

**Finding:** There's no mechanism to take a Twilio Video room's composite output and push it to an AWS IVS channel for broadcast. This is the critical missing piece for the "Twilio for barbers, IVS for viewers" architecture.

**Fix needed:** Either:

1. Use Twilio's `Composition` API to create a composite recording → upload to IVS as VOD
2. Use a media server (e.g., AWS MediaLive) to pull from Twilio and push to IVS
3. Have barbers stream directly to IVS (bypassing Twilio for live battles)

### 4C. `HLSVideoPlayer.tsx` Exists But Has No IVS Integration

**Finding:** The HLS player component exists and can play `.m3u8` streams, but no battle workflow currently populates `ivs_playback_url` on the battles table. The player is ready but has no data source.

---

## SECTION 5: MISSING ANTI-GRAVITY AGENTS (Automated Processes)

Based on the audit, these are the automated "agents" that need to be built or fixed:

### Currently Working Agents


| Agent                                   | Status                                      |
| --------------------------------------- | ------------------------------------------- |
| `auto-close-voting` (pg_cron)           | Working — closes expired voting battles     |
| `check-battle-submissions` (pg_cron)    | Working — handles forfeits                  |
| `cleanup-expired-challenges` (pg_cron)  | Working — expires stale challenges          |
| `expire_bounties_batch` (pg_cron)       | Pending setup — function exists, needs cron |
| `cleanup-community-notes` (pg_cron)     | Working — purges old notes                  |
| `tournament-matchmaker` (pg_cron)       | Working but has FK bug (3F above)           |
| `recompute_reputation` (trigger)        | Working — fires on review insert            |
| `handle_bounty_status_change` (trigger) | Working — refunds/notifies                  |


### Missing Agents to Build


| Agent                         | Purpose                                                        | Type                          |
| ----------------------------- | -------------------------------------------------------------- | ----------------------------- |
| **auto-distribute-pot**       | Pay out winner + apply economy split when battle completes     | Add to `auto-close-voting`    |
| **ivs-channel-provisioner**   | Create IVS channel when battle is created/scheduled            | New edge function             |
| **ivs-webhook-handler**       | Receive IVS stream state changes (live/offline/recording done) | New edge function             |
| **stream-viewer-sync-ivs**    | Replace YouTube viewer sync with IVS viewer count              | Rewrite `sync-battle-viewers` |
| **m4m-fund-reporter**         | Aggregate M4M fund balance for admin dashboard                 | New RPC                       |
| **battle-reminder-agent**     | Notify barbers 24h and 1h before scheduled battles             | New edge function + cron      |
| **subscription-expiry-agent** | Handle expired barber subscriptions, downgrade tier            | New cron job                  |
| **strike-enforcement-agent**  | Auto-DQ barbers with 3+ no-shows from tournaments              | New trigger or cron           |


---

## SECTION 6: PRIORITY IMPLEMENTATION ROADMAP

### Phase 1 — Economy Integrity (Critical)

1. Remove or redirect `donate-to-battle` edge function to use `process_battle_donation` RPC
2. Add `FOR UPDATE` locks to all BB-mutating edge functions
3. Remove client-side `deductBucks` mutation from `useBarberBucks`
4. Add auto-distribute-pot logic to `auto-close-voting`
5. Fix `distribute-pot` to respect 80/15/5 for official categories

### Phase 2 — Battle Lifecycle Fixes (High)

1. Fix `submit-battle-video` to accept HLS/IVS URLs (remove YouTube regex)
2. Fix `start-live-stream` status from `'voting'` to `'active'`
3. Fix `tournament-matchmaker` FK mismatch (user_id vs barber_profiles.id)
4. Fix `complete-match` to use service role key

### Phase 3 — AWS IVS Integration (High)

1. Add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` secrets
2. Build `create-ivs-channel` edge function
3. Build `ivs-webhook-handler` edge function
4. Rewrite `sync-battle-viewers` for IVS
5. Remove `check-youtube-live` and `sync-battle-viewers` YouTube code

### Phase 4 — Missing Agents (Medium)

1. Battle reminder notifications (24h + 1h before)
2. Subscription expiry handler
3. Strike enforcement (3 no-shows = DQ)
4. M4M fund reporting in Sovereign HQ

### Phase 5 — Cleanup (Low)

1. Remove all YouTube references from edge functions
2. Remove `YOUTUBE_API_KEY` secret once IVS is live
3. Set up pg_cron for `expire_bounties_batch`