

## Fix Challenge UX: Remove Country Challenge, Add Centered Challenge Modal

### Problem
1. "Challenge This Country" button still shows on country leaderboard cards — not wanted
2. Challenge creation is buried and hard to find
3. The "Battle" button in the arena drawer navigates to /portal instead of opening a direct challenge flow

### Changes

#### 1. Remove "Challenge This Country" from `CountryLeaderCard.tsx`
- Remove `onChallenge` prop, `Swords` import, and the challenge button block (lines 170-181)

#### 2. Remove `onChallenge` from `CountryLeaderboard.tsx`
- Stop passing `onChallenge` prop to `CountryLeaderCard`

#### 3. Create `ChallengeModal.tsx` — centered fullscreen-style dialog
- New file: `src/components/battles/ChallengeModal.tsx`
- Use `createPortal` pattern (like AddFundsModal) so it renders as a fixed overlay centered on any screen
- Contains the `IssueChallenge` form and below it a compact `ChallengeFeed` showing active challenges
- Styled with a dark backdrop, centered card with max-width, close X button top-right
- Simple, stylistic, always centered regardless of scroll position

#### 4. Update `DynamicBattleHero.tsx` — "Battle" button opens ChallengeModal
- Replace the "Battle" row's `navigate('/portal')` with opening the new `ChallengeModal`
- Replace the "Issue Challenge" row similarly — both open the same modal
- Add `ChallengeModal` state and render it as a sibling to the Drawer (not nested inside)
- Close the arena drawer first, then open the modal

