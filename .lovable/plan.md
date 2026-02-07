

# Battle System Audit: Official vs Unofficial Battles + Challenge System

## Overview

Restructure the battle system into two distinct tiers:

1. **Official Tournament Battles** -- The existing 5-category tournament queue system. These count toward global rankings, prizes, and leaderboards. Entry: 250 BB.
2. **Unofficial Custom Battles** -- Premium barbers (Bronze+) can host custom battles that do NOT affect rankings or official prizes. These are for fun, practice, or personal showdowns.
3. **Personal Challenge System** -- Any barber can directly challenge another barber. Requires a minimum 100 BB stake from each side. Does NOT count toward rankings.

## What Changes

### 1. Database: Add `battle_type` column to `battles` table

Add a new column to distinguish official from unofficial battles:

- `battle_type TEXT NOT NULL DEFAULT 'official'` -- values: `'official'`, `'unofficial'`, `'challenge'`

This lets every part of the system (rankings, leaderboards, prize pools) filter on `battle_type = 'official'` to exclude unofficial and challenge battles.

### 2. Rework the CreateBattle Page (Unofficial Battles Only)

Keep `src/pages/CreateBattle.tsx` but repurpose it for **unofficial battles only**:

- Add a clear "UNOFFICIAL" banner at the top explaining these battles don't count for rankings
- Gate access to **premium subscribers only** (Bronze, Silver, Gold) using `useSubscriptionLimits`
- Free-tier barbers see an upgrade prompt instead
- When the battle is inserted into the database, set `battle_type: 'unofficial'`
- Remove the bounty/USD prize fields (unofficial battles use BB stakes or are just for fun)
- Keep category selection from the 5 official categories (so the battles are still organized)

### 3. Rebuild the Challenge System

Overhaul the existing challenge components to enforce the 100 BB minimum stake:

**`IssueChallenge.tsx`** -- Major rework:
- Remove the YouTube "Go Live" button and stream URL fields (challenges are video-submission based, not live)
- Replace the USD bounty section with a **BB stake field** (minimum 100 BB)
- On submit: call the existing `create-challenge-stake` edge function (already enforces 100 BB min and escrow)
- The created battle gets `battle_type: 'challenge'`
- Show the user's current BB balance

**`AcceptChallengeModal.tsx`** -- Update:
- Show the stake amount the acceptor must match
- Call the existing `match-challenge-stake` edge function (already handles escrow matching)
- Remove the YouTube stream URL requirement; replace with a simple confirmation

**`ChallengeFeed.tsx`** -- Update:
- Display the BB stake amount prominently (instead of USD bounty)
- Show "UNOFFICIAL - No Ranking Impact" badge on each challenge card
- Keep real-time subscription and 2-hour expiry

**`ChallengeStreamSection.tsx`** -- Remove entirely:
- The camera-preview-based challenge flow is overly complex and not aligned with the video-submission model

**`OpenChallengeQueue.tsx`** -- Simplify:
- Remove the camera/stream references
- Keep as the container for IssueChallenge + ChallengeFeed

### 4. Edge Function Updates

**`create-challenge-stake/index.ts`** -- Minor update:
- When creating the battle record, set `battle_type: 'challenge'`
- Already enforces 100 BB minimum -- no change needed there

**`match-challenge-stake/index.ts`** -- No changes needed (already handles escrow matching correctly)

**`complete-open-challenge/index.ts`** -- Update:
- Set `battle_type: 'challenge'` on the battle when completing
- Remove YouTube stream URL requirement from validation

**`distribute-pot/index.ts`** -- No changes needed (already handles pot distribution)

### 5. UI Cleanup

**`src/pages/Portal.tsx`**:
- Remove `ChallengeStreamSection` import and rendering (camera-based challenges removed)
- Keep `OpenChallengeQueue` (with the new simplified challenge flow)
- Keep `TournamentRegistration` (official path)

**`src/pages/BattlesPage.tsx`**:
- Change the "Create Battle" button to say "Create Unofficial Battle" 
- Gate it behind premium subscription check
- Add badge showing "UNOFFICIAL" on unofficial/challenge battles in the grid
- Add badge showing "OFFICIAL" on tournament battles

**`src/components/barber/MyBattlesSection.tsx`**:
- Change empty state button from "Create a Battle" to link to Portal (tournament registration)
- Add a small "or create an unofficial battle" link below for premium barbers
- Show battle type badges (Official / Unofficial / Challenge) on each battle card

**`src/components/BattlesSection.tsx`**:
- Remove the static fallback battles with fake categories
- Add battle type badge to "My Active Battles" cards

### 6. Ranking Protection

Any existing ranking, leaderboard, or prize pool queries that read from the `battles` table should be updated to filter by `battle_type = 'official'`. Key areas:

- `src/hooks/useCategoryPrizePools.tsx` -- add filter
- `src/hooks/useCategoryTopBarbers.tsx` -- add filter
- `src/components/portal/CountryLeaderboard.tsx` -- add filter
- Any RPC functions that aggregate battle results for rankings

## Files to Modify

| File | Change |
|------|--------|
| **Database migration** | Add `battle_type` column to `battles` table |
| `src/pages/CreateBattle.tsx` | Repurpose for unofficial battles, gate behind premium subscription |
| `src/components/battles/IssueChallenge.tsx` | Replace with BB-stake challenge form (100 BB min) |
| `src/components/battles/AcceptChallengeModal.tsx` | Show stake matching, remove stream URL |
| `src/components/battles/ChallengeFeed.tsx` | Show BB stake, add unofficial badge |
| `src/components/battles/OpenChallengeQueue.tsx` | Simplify (remove stream references) |
| `src/pages/Portal.tsx` | Remove ChallengeStreamSection |
| `src/pages/BattlesPage.tsx` | Add unofficial badge, gate create button |
| `src/components/barber/MyBattlesSection.tsx` | Update empty state, add battle type badges |
| `src/components/BattlesSection.tsx` | Remove fallback battles, add type badges |
| `supabase/functions/create-challenge-stake/index.ts` | Set battle_type on challenge creation |
| `supabase/functions/complete-open-challenge/index.ts` | Set battle_type on challenge completion |
| `src/hooks/useCategoryPrizePools.tsx` | Filter by official battles only |
| `src/hooks/useCategoryTopBarbers.tsx` | Filter by official battles only |

## Files to Delete

| File | Reason |
|------|--------|
| `src/components/battles/ChallengeStreamSection.tsx` | Camera-based challenge system replaced by simpler BB-stake model |

## Battle Type Summary

```text
+---------------------+------------------+------------------+-------------------+
| Feature             | Official         | Unofficial       | Challenge         |
+---------------------+------------------+------------------+-------------------+
| Entry Point         | Tournament Queue | Create Battle pg | Issue Challenge    |
| Cost                | 250 BB           | Free (premium)   | 100 BB min stake  |
| Who Can Create      | Any barber       | Premium barbers  | Any barber        |
| Affects Rankings    | Yes              | No               | No                |
| Prize Pool          | Official prizes  | None             | Winner takes pot  |
| Categories          | 5 official       | 5 official       | Freestyle         |
| Subscription Needed | No               | Yes (Bronze+)    | No                |
+---------------------+------------------+------------------+-------------------+
```

