

## Auto-Expire & Cleanup Expired Challenges

### Problem
Challenges have an `expires_at` timestamp set to 1 hour, but expired ones are only filtered client-side. They remain in the database forever, and the staked BB is never refunded.

### Changes

#### 1. New edge function: `cleanup-expired-challenges/index.ts`
- Query `open_challenges` where `status = 'waiting_for_opponent'` AND `expires_at < NOW()`
- For each expired challenge:
  - Refund the `stake_amount` back to the challenger's `profiles.barber_bucks`
  - Record a `challenge_stake_refund` transaction in `barber_bucks_transactions`
  - Update challenge status to `expired`
  - Delete the challenge row (or keep as `expired` for audit trail — will mark expired)
- Add `verify_jwt = false` in config.toml so it can be called by cron

#### 2. Schedule cron job via `pg_cron`
- Run every 5 minutes: calls `cleanup-expired-challenges` edge function
- Uses `pg_net` to HTTP POST to the function URL with the anon key

#### 3. Update `ChallengeFeed.tsx`
- The existing client-side filter already removes expired challenges from display — no change needed there
- Update the "Waiting for opponent" text to show the countdown timer for the challenger's own challenge (reuse the existing `CountdownBadge` component)

#### 4. Update `create-challenge-stake/index.ts`
- Also pre-create a battle record (status `upcoming`) when issuing a challenge, and store its ID in `open_challenges.battle_id` — this is already expected by `complete-open-challenge`. Currently it's missing, which would cause errors. Will add this creation step.

### Architecture
```text
Every 5 min:
  pg_cron → cleanup-expired-challenges edge function
    → finds expired challenges
    → refunds BB to challenger
    → marks status = 'expired'
```

