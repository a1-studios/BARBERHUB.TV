

## Root Cause

When the targeted barber receives the realtime `challenge_received` notification, `useNotifications.tsx` (lines 104-118) shows a Sonner toast with a generic "View" button. Because the notification payload includes `battle_id`, the toast's `actionTarget` is computed as `/battles/{battle_id}` — clicking it (or the toast surface in some flows) sends them straight into the battle/contender route, where the camera permission prompt fires immediately. They never see the Accept/Deny modal.

The notification panel itself handles `challenge_received` correctly (opens `AcceptChallengeModal`), but most users tap the live toast first and never open the panel.

## Fix Plan

### 1. `src/hooks/useNotifications.tsx` — make the toast type-aware
Branch on `newNotification.type` before computing `actionTarget`:
- **`challenge_received`** → no auto-link. Toast says *"⚔️ You've Been Challenged! Tap the bell to accept or deny."* with a "View" action that opens the notification panel (dispatch a custom event `open-notifications` or navigate to `?notifications=open`). Do **not** route to the battle.
- **`challenge_accepted`** → action goes to `/battle/{battle_id}/contender` (split-screen room), not `/battles/{battle_id}`.
- All other types keep current behavior.

### 2. Header / notification trigger — listen for `open-notifications` event
The header bell already opens the panel on click. Add a `window.addEventListener('open-notifications', …)` in the bell component (or wherever the panel state lives) so the toast's "View" button programmatically opens the dropdown → user taps the `challenge_received` row → `AcceptChallengeModal` opens with Accept/Deny.

### 3. `AcceptChallengeModal.tsx` — add explicit "Decline" button
Currently the modal only has Accept (closing the dialog = implicit decline, which is unclear). Add a secondary **"Decline"** button next to Accept that:
- Calls a small new edge action (or direct update) to mark the challenge `declined` for this target
- Inserts a `challenge_declined` notification back to the challenger
- Closes the modal

(Lightweight — can land in the same file; declining just updates `open_challenges.status='declined'` via RLS-safe RPC or skip server-side for now and just close + toast "Challenge declined".)

### 4. Optional safety — `NotificationPanel.tsx` fallback
Reorder the click handler so the generic `if (n.data?.battle_id)` fallback at line 97 only fires when `n.type` isn't already handled above. Already true today via early `return`, but add a comment so future edits don't regress.

## File Plan

| File | Change |
|------|--------|
| `src/hooks/useNotifications.tsx` | Type-aware toast: `challenge_received` opens notification panel via custom event (no battle nav); `challenge_accepted` routes to `/battle/{id}/contender` |
| `src/components/NotificationPanel.tsx` (or header bell wrapper) | Listen for `open-notifications` event → open dropdown |
| `src/components/battles/AcceptChallengeModal.tsx` | Add explicit "Decline" button + handler |

## Result
- **Acceptor sees toast** → "⚔️ You've Been Challenged! Tap to respond" → tap → notification panel opens → tap challenge → **AcceptChallengeModal opens with Accept + Decline** → no camera permission until they Accept → on Accept → drops into `/battle/{id}/contender` split-screen room.
- **Challenger** (already working) stays in their waiting room.

