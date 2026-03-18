

## Remove BB Awards from Voting & Ensure Proper Transaction Logging

### Problem
The `useVoteCombo` hook directly mutates `profiles.barber_bucks` on the client side when users hit vote combo milestones (2x, 5x, 10x, 20x). This is incorrect — voting should never award BB. BB should only come from:
1. **Purchasing** (Stripe → `purchase-barber-bucks`)
2. **Receiving donations/tips** (`process-bb-donation`, `process_battle_donation`)
3. **Winning spin wheel prizes** (`spin-wheel`)
4. **Admin awards** (`admin-award-barber-bucks`)

The combo system also writes directly to `profiles.barber_bucks` from the client, violating the economy integrity rule.

### Fix

#### 1. Strip BB rewards from vote combos
- In `src/hooks/useVoteCombo.tsx`: Remove the entire BB award block (lines 75-91) that updates `profiles.barber_bucks`
- Remove the `bonus_bb_earned` field from the upsert to `user_vote_combos`
- Remove all `bonusEarned` state tracking
- Keep the combo counter as a fun engagement mechanic (visual only — no BB)
- Update `COMBO_REWARDS` to show hype messages only, no `bb` values

#### 2. Update VoteComboIndicator UI
- In `src/components/battles/VoteComboIndicator.tsx`: Remove the "BB earned" display since combos no longer award BB
- Show only the combo streak count as a visual indicator

#### 3. No other changes needed
The legitimate BB flows (purchases, donations, spin wheel, admin awards) already use edge functions with proper transaction logging via `barber_bucks_transactions`. Those will correctly reflect in the profile and economy panels.

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useVoteCombo.tsx` | Remove BB award logic from combo milestones, keep combo as visual-only |
| `src/components/battles/VoteComboIndicator.tsx` | Remove BB earned display, show combo streak only |

