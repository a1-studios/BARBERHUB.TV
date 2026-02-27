

## Revamp Challenge System: Open to All Silver+ Barbers, Time-Capped, Jackpot Prize Pool

### Summary
Challenges become open to any Silver+ subscriber barber. Add a 1-hour time cap, let challengers name it and set stake amount. Create a separate `challenge_prize_pool` table that accumulates platform fees from challenges (jackpot style, like `category_prize_pools` but independent).

### Database Changes

#### 1. New table: `challenge_prize_pool`
```sql
CREATE TABLE challenge_prize_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_year integer NOT NULL DEFAULT EXTRACT(year FROM now())::integer,
  total_pool_bb integer NOT NULL DEFAULT 0,
  total_challenges_completed integer NOT NULL DEFAULT 0,
  platform_fees_collected_bb integer NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
-- RLS: anyone can view, only system can modify
```

#### 2. Add columns to `open_challenges`
```sql
ALTER TABLE open_challenges
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;
```

### Edge Function Changes

#### `create-challenge-stake/index.ts`
- Add Silver+ subscription check: query `barber_subscriptions` joined with `barber_subscription_tiers` to verify tier is `silver` or `gold`
- Accept `duration_minutes` param (default 60, max 60)
- Calculate `expires_at = now() + duration_minutes`
- Store `duration_minutes` and `expires_at` in `open_challenges` insert
- Remove `stream_url` as required field (set default 'pending')

#### `match-challenge-stake/index.ts`
- Add Silver+ subscription check for the acceptor too
- On successful match, contribute 5% platform fee to `challenge_prize_pool` (increment `platform_fees_collected_bb` and `total_pool_bb`)

#### `complete-open-challenge/index.ts`
- On challenge completion, increment `total_challenges_completed` in `challenge_prize_pool`

### Frontend Changes

#### `IssueChallenge.tsx`
- Add Silver+ tier gate check using `useSubscriptionLimits` — show upgrade prompt if not Silver+
- Remove stream_url requirement
- Add duration display (fixed at 1 hour, shown as info badge)
- Keep title and stake amount fields

#### `ChallengeFeed.tsx`
- Show challenges to ALL authenticated barbers (not just the issuer's view)
- Change query filter from `status = 'open'` to `status = 'waiting_for_opponent'` to match DB
- Add `expires_at` countdown display on each card
- Filter out expired challenges client-side
- Add Silver+ check on "Accept" button — show upgrade prompt if not Silver+
- Show challenge jackpot pool total at the top of the feed

#### `AcceptChallengeModal.tsx`
- Add Silver+ subscription check before allowing acceptance
- Show duration/time remaining info

#### `OpenChallengeQueue.tsx`
- Show section to ALL barbers (remove the Silver+ gate for viewing, only gate creating/accepting)
- Add jackpot pool display card at top showing accumulated challenge pool

### Visibility
- Challenges visible to all barbers in the Portal
- Creating and accepting gated to Silver+ subscribers
- Non-Silver barbers see challenges but get an upgrade prompt when trying to interact

