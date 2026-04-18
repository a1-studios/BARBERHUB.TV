

## Real Root Cause (verified via DB + edge logs)

`match-challenge-stake` has **never been invoked** despite multiple `challenge_received` notifications being marked read. The reason: in `Header.tsx` (line 266), `NotificationPanel` is rendered **inside the BB dropdown's conditional `{bbDropdownOpen && (...)}` block**. When the user taps a `challenge_received` notification, `handleClick` does:

1. `setAcceptChallenge(ch)` — schedules the modal to open
2. `closeSelf()` → `onClose()` → `setBbDropdownOpen(false)` → **the dropdown unmounts**, taking `NotificationPanel` AND its child `AcceptChallengeModal` with it

The modal never renders. The Accept button never exists. Hence: no edge function call, challenge stays `waiting_for_opponent`, no battle goes live.

## Fix

### 1. Lift `AcceptChallengeModal` out of `NotificationPanel` and into `Header.tsx`
The modal must live at the Header level (a sibling of the dropdown, not a child) so it survives dropdown unmount.

**Pattern:**
- Add `acceptChallenge` state in `Header.tsx`
- Pass `onOpenAcceptModal={(ch) => setAcceptChallenge(ch)}` callback into `NotificationPanel`
- In `NotificationPanel.handleClick`: call `onOpenAcceptModal(ch)` then `closeSelf()` — modal lives on after panel closes
- Render `<AcceptChallengeModal>` in `Header.tsx` outside the dropdown conditional

### 2. After Accept succeeds in `AcceptChallengeModal`
Already correct: navigates to `/battle/{battle_id}/contender`. The acceptor's `barber_profiles.id` is now wired to `barber2_id` by the edge function, so `ContenderTheater` will recognize them as `barberPosition=2` and they'll see the split-screen contender room.

### 3. Defensive: log Accept invocation
Add `console.log('Accept challenge clicked', challenge.id)` at the top of `handleAccept` so future debugging can confirm the click reached the handler.

## Files

| File | Change |
|------|--------|
| `src/components/Header.tsx` | Add `acceptChallenge` state; pass `onOpenAcceptModal` into `NotificationPanel`; render `<AcceptChallengeModal>` at Header root level (outside dropdown div) |
| `src/components/NotificationPanel.tsx` | Accept new prop `onOpenAcceptModal?: (ch) => void`; remove internal `acceptChallenge` state + modal render; in `handleClick` for `challenge_received` call `onOpenAcceptModal(ch)` then `closeSelf()` |
| `src/components/battles/AcceptChallengeModal.tsx` | Add `console.log` at top of `handleAccept` for debugging |

## Result
- Acceptor taps notification → panel calls `onOpenAcceptModal(ch)` → Header sets state → dropdown closes → `AcceptChallengeModal` renders at Header root (unaffected by dropdown unmount) → user sees Accept/Decline buttons
- Tap Accept → `match-challenge-stake` runs → battle gets `barber2_id` + `status='live'` → modal navigates to `/battle/{battle_id}/contender` → ContenderTheater identifies them as `barberPosition=2` → split-screen room with challenger already waiting on the other side

