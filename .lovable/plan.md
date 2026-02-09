

## Safe Audit, Cleanup, and Mobile Optimization

### Verification Results

I manually searched for every import of each candidate file across all `.tsx` and `.ts` source files (excluding the build cache `tsconfig.app.tsbuildinfo`). Here are the results:

| File | Imported Anywhere? | Route in App.tsx? | Safe to Delete? |
|------|-------------------|-------------------|-----------------|
| `src/App.css` | No (never imported in main.tsx or anywhere) | N/A | YES |
| `src/components/HaircutAdvisorSection.tsx` | No | N/A | YES |
| `src/components/VirtualHaircutTryOn.tsx` | No | N/A | YES |
| `src/components/OnboardingMessage.tsx` | No | N/A | YES |
| `src/components/DigitalGrove3D.tsx` | No | N/A | YES |
| `src/components/HeroSection.tsx` | No | N/A | YES |
| `src/components/GlobalContendersHeader.tsx` | No | N/A | YES |
| `src/components/VerificationBadge.tsx` | No | N/A | YES |
| `src/components/NotificationBell.tsx` | No | N/A | YES |
| `src/components/BattleArenaCarousel.tsx` | No | N/A | YES |
| `src/components/BattleCommentsPanel.tsx` | No | N/A | YES |
| `src/components/FanActionZone.tsx` | No (only imports HaircutAdvisorModal internally) | N/A | YES |
| `src/components/VideoUpload.tsx` | No | N/A | YES |
| `src/pages/HaircutAdvisor.tsx` | No route in App.tsx | N/A | YES |
| `src/pages/HeadToHeadBattles.tsx` | No route in App.tsx | N/A | YES |

**All 15 files are confirmed dead code** -- zero imports from any live source file and no routes pointing to the page files.

---

### 1. Fix Voting Logic (Critical)

**Problem:** The DynamicBattleHero currently shows vote buttons in TWO incorrect scenarios:

1. **"Demo Mode"** -- when there is no active battle, vote buttons appear on random barber showcase videos. This is misleading because there is nothing to vote on.
2. **During live battles** (`status === 'active'`) -- votes should only be allowed AFTER the battle is done (status === `'voting'`).

The `showDemoMode` variable is defined as:
```
const showDemoMode = !battle || (!isVotingPhase && displayBarbers.length >= 2);
```
This means vote buttons show up even when there is no battle at all.

Additionally, the `handleVote` function has a bug where it shows a success toast (`"Vote recorded!"`) even when no submission is found or when an error occurs in the catch block.

**Fix in `src/components/DynamicBattleHero.tsx`:**
- Remove the `showDemoMode` variable entirely
- Change `showVote` to ONLY be `true` when `isVotingPhase` (battle status is `'voting'`)
- Fix the false success toasts: show `toast.info("No submission found")` instead of `toast.success` when submissions are missing
- Show `toast.error("Failed to submit vote")` in the catch block instead of `toast.success`
- Remove `showDemoMode` from the progress bar condition too (only show during `isActiveBattle`)

This ensures voting buttons ONLY appear on videos that are in the voting phase after the battle has concluded.

---

### 2. Prevent Mobile Zoom (Native App Feel)

**Change in `index.html`:**
Update the viewport meta tag to disable pinch-zoom and cover notched devices:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

**Change in `src/index.css`:**
Add `touch-action: manipulation` to the body element to prevent double-tap zoom while preserving normal scroll and single-tap behavior.

---

### 3. Remove Unused `useUserRole` in Index.tsx

**Change in `src/pages/Index.tsx`:**
- Remove `import { useUserRole } from "@/hooks/useUserRole";`
- Remove `const { isBarber } = useUserRole();`

`isBarber` is destructured but never used anywhere in the component. This triggers an unnecessary database query on every page load.

---

### 4. Delete 15 Dead Files

All files listed in the verification table above will be deleted. None of them are imported by any live code or routed in App.tsx.

---

### Summary of All Changes

| File | Action | Why |
|------|--------|-----|
| `index.html` | Edit viewport meta | Prevent zoom, support notched devices |
| `src/index.css` | Add touch-action rule | Prevent double-tap zoom on mobile |
| `src/pages/Index.tsx` | Remove unused useUserRole | Eliminate unnecessary DB query |
| `src/components/DynamicBattleHero.tsx` | Fix voting logic | Votes only during voting phase, fix false success toasts |
| 15 dead files | Delete | Zero imports, confirmed dead code |

### Technical Details: Voting Logic Change

Before:
```text
showVote = (isVotingPhase || showDemoMode) && !isCurrentUserInBattle
```
Where `showDemoMode = !battle || (!isVotingPhase && displayBarbers.length >= 2)` -- this is almost always true.

After:
```text
showVote = isVotingPhase && !isCurrentUserInBattle
```

This means:
- During `upcoming` battles: No vote buttons (correct -- battle hasn't started)
- During `active` battles: No vote buttons (correct -- battle is live, watch only)
- During `voting` battles: Vote buttons appear (correct -- battle ended, time to vote)
- No battle at all: No vote buttons (correct -- just showcasing barber profiles)

### What Is NOT Being Changed

- Twilio streaming infrastructure -- remains intact for live battles
- All battle flow logic (upcoming -> active -> voting -> completed) -- unchanged
- BattleDetails page voting -- already correctly gated by `battle.status === 'voting'`
- ArenaActionBar component -- unchanged (it receives `showVote` as a prop)
- AWS storage integration space -- nothing blocks future AWS addition

