

# Challenge Stake Toggle — Make Stakes Optional with Sovereign Override

## Goal
Remove the mandatory 100 BB stake from barber-vs-barber challenges. Barbers can challenge each other freely; viewers can still donate into a winner-takes-all bucket. Add a Sovereign HQ switch to re-enable stakes and configure any minimum amount.

## Architecture

### New Sovereign-controlled platform_state keys
- `challenge_stakes_enabled` — `'false'` (default after this change). When `'true'`, stakes are required again.
- `challenge_min_stake_bb` — `'100'` (default). Configurable minimum when stakes are re-enabled.

### Data model — already supports the new behavior
`open_challenges` already has `donations_total` and `pot_total`. When stakes are off:
- `stake_amount = 0`
- `pot_total` starts at `0` and grows purely from viewer donations (via existing `donate-to-battle` flow)
- Winner takes the donated pot minus 5% (existing `auto-close-voting` / `distribute-pot` logic already handles `pot_total` regardless of source)

### Frontend changes (read `useChallengeStakeConfig` hook)

**New hook** `src/hooks/useChallengeStakeConfig.tsx` — reads both `platform_state` keys with realtime sync (mirrors `useTiersEnabled` pattern):
```ts
{ stakesEnabled: boolean, minStake: number, loading: boolean }
```

**`ChallengeModal.tsx` (Direct Challenge)**
- When `stakesEnabled === false`: hide the stake slider + balance row entirely. Replace CTA with `⚔️ Challenge {Name}` (no BB amount). Submit with `stake_amount: 0`.
- When `stakesEnabled === true`: show slider with `min={minStake}` (configurable, not hardcoded 100).

**`ChallengeFeed.tsx`**
- `QUICK_PRESETS`: when stakes off, render preset cards without the BB amount badge; submit `stake_amount: 0`.
- `CustomChallengeForm`: hide stake slider + balance check when off.
- Open challenge cards: hide "Match stake" / "Total pot" block when `stake_amount === 0`. Show "Donations: {pot_total} BB" instead (live viewer-funded pot).
- Remove the `.gt('stake_amount', 0)` filter on the query so zero-stake challenges appear.

**`AcceptChallengeModal.tsx`**
- When `stake_amount === 0`: hide the entire stake/balance block. CTA becomes `⚔️ Accept Challenge` (no balance check, no matching).

### Backend changes

**`create-challenge-stake/index.ts`**
- Read `challenge_stakes_enabled` + `challenge_min_stake_bb` from `platform_state` at top of handler.
- If stakes disabled:
  - Skip min-stake validation
  - Skip balance check + escrow deduction
  - Skip stake escrow transaction insert
  - Insert challenge with `stake_amount: 0`, `pot_total: 0`
  - Pre-create battle with `prize_amount: 0` (will grow from donations)
- If stakes enabled: enforce `stake_amount >= challenge_min_stake_bb` (replace hardcoded `MIN_STAKE_BB = 100`).

**`match-challenge-stake/index.ts`**
- If `challenge.stake_amount === 0`: skip balance check + escrow deduction + stake transaction. Set `opponent_stake_matched: true` automatically. `pot_total` stays as donations-only.
- Existing platform fee math (`totalPot * 0.05`) still works on the donation-only pot.

**`sovereign-system-control/index.ts`**
Add 3 new actions:
- `challenge_stakes_enable` — sets `challenge_stakes_enabled='true'`
- `challenge_stakes_disable` — sets `challenge_stakes_enabled='false'`
- `challenge_set_min_stake` — accepts `min_stake_bb` from request body, upserts `challenge_min_stake_bb`

### Sovereign HQ UI — `KillSwitchPanel.tsx`
Add a 6th tile labeled **"Challenge Stakes"**:
- Toggle: enable/disable stakes (orange dot when ON, grey when OFF)
- Inline number input (visible only when ENABLED) to set min stake BB → calls `challenge_set_min_stake`
- Confirmation dialog requires typing `ENABLE` / `DISABLE`

### Migration
Insert two rows into `platform_state`:
```sql
INSERT INTO platform_state (key, value) VALUES
  ('challenge_stakes_enabled', 'false'),
  ('challenge_min_stake_bb', '100')
ON CONFLICT (key) DO NOTHING;
```
(`platform_state` already in `supabase_realtime` publication from previous migration.)

## File Plan

| File | Change |
|------|--------|
| **Migration** | Insert `challenge_stakes_enabled='false'` + `challenge_min_stake_bb='100'` |
| `src/hooks/useChallengeStakeConfig.tsx` | **New** — query + realtime for both keys |
| `src/components/battles/ChallengeModal.tsx` | Hide stake UI when disabled; submit `stake_amount: 0` |
| `src/components/battles/ChallengeFeed.tsx` | Conditional stake UI in presets/custom form/cards; remove `gt('stake_amount', 0)` filter |
| `src/components/battles/AcceptChallengeModal.tsx` | Skip stake block + balance check when stake is 0 |
| `src/components/sovereign/KillSwitchPanel.tsx` | Add "Challenge Stakes" tile + min-stake input |
| `supabase/functions/create-challenge-stake/index.ts` | Branch on `challenge_stakes_enabled`; respect configurable min |
| `supabase/functions/match-challenge-stake/index.ts` | Skip escrow when `stake_amount === 0` |
| `supabase/functions/sovereign-system-control/index.ts` | Add `challenge_stakes_enable/disable` + `challenge_set_min_stake` actions |

## Behavior Summary
- **Default (after deploy)**: Barbers challenge each other for free. No BB locked. Viewers donate → winner takes 95% of donations, 5% goes to Challenge Jackpot pool.
- **Sovereign re-enables**: Old behavior returns. Min stake configurable from the panel (any amount, e.g. 50, 250, 500).

