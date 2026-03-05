

## Redesign Challenge System — Unified, Game-Like, On-Brand

### Goal
Merge `IssueChallenge` into `ChallengeFeed` as a single unified component. The presets (already in ChallengeFeed) become the primary way to start a challenge — big, tappable, fun cards. A collapsible "Custom Challenge" section replaces the full IssueChallenge form. Delete the standalone `IssueChallenge.tsx` to eliminate duplication.

### Changes

| File | Action |
|------|--------|
| `src/components/battles/ChallengeFeed.tsx` | **Modify** — Add collapsible "Custom Challenge" section (title + stake slider + message) below the presets. Make preset cards larger with `motion` tap animations. Update empty state copy. |
| `src/components/battles/IssueChallenge.tsx` | **Delete** — Absorbed into ChallengeFeed |
| `src/components/battles/ChallengeModal.tsx` | **Modify** — Remove tabs (no longer needed since feed includes creation). Show single `<ChallengeFeed />`. Rename header to "CHALLENGE ARENA". Remove IssueChallenge import. |
| `src/components/battles/OpenChallengeQueue.tsx` | **Modify** — Remove IssueChallenge import, remove Drawer (no longer needed since ChallengeFeed has inline creation). Keep section title as "Challenges". |

### ChallengeFeed Unified Layout
1. **Jackpot Banner** (existing)
2. **Preset Cards** (existing, enhanced with `motion.button whileTap` and slightly larger)
3. **"Custom Challenge" Collapsible** — uses Collapsible component, contains: title input, stake Slider (100-500 BB), optional message textarea, submit button. Only visible for Silver+ barbers.
4. **Active Challenges List** (existing)

### What stays the same
- All backend logic (`create-challenge-stake` edge function) unchanged
- AcceptChallengeModal unchanged
- CountdownBadge unchanged
- Silver+ gating logic unchanged
- Challenge cards layout unchanged

