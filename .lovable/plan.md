

## Fix Stale Challenges + Add Preset Quick-Challenges + Default to Active Feed

### Problem
1. Two challenges (IDs `b34f7b3d...` and `2570718c...`) have `expires_at = NULL` and `stake_amount = 0` — they bypass both expiry and client-side filtering
2. No quick-start presets for challenges
3. ChallengeModal defaults to "Issue Challenge" tab instead of "Active Challenges"

### Changes

#### 1. SQL migration: Delete the two orphaned challenges
```sql
UPDATE open_challenges SET status = 'expired' 
WHERE id IN ('b34f7b3d-e645-44c7-bde3-093f7d9f3554', '2570718c-4082-45b4-83af-bc3a28c8743b');
```

#### 2. Update `ChallengeFeed.tsx` — add client-side guard + 3 preset challenge cards
- Filter out challenges where `expires_at IS NULL` (legacy data without expiry)
- Add a "Quick Challenges" section above the active feed with 3 preset cards:
  - **"Sharpest Fade"** — 100 BB stake, auto-fills title
  - **"Beard Battle"** — 150 BB stake, auto-fills title
  - **"Freestyle Showdown"** — 200 BB stake, auto-fills title
- Each preset is a single-click button that calls `create-challenge-stake` directly with the preset title/stake
- When no active challenges exist, show presets prominently as the main content

#### 3. Update `ChallengeModal.tsx` — default tab to "feed"
- Change `defaultValue="issue"` → `defaultValue="feed"` so barbers land on Active Challenges first
- Accept an optional `initialTab` prop so it can be opened to either tab

#### 4. Harden `ChallengeFeed` query
- Add `.not('expires_at', 'is', null)` to the DB query so challenges without expiry are excluded server-side
- Also filter out `stake_amount = 0` challenges (invalid — minimum is 100 BB)

