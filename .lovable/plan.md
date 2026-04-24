## Goal
Three focused fixes to the live battle experience:

1. **Viewers in the LIVE LiveKit arena get visible Vote + Donate buttons** (currently they only have chat/reactions — no way to vote or tip during the live stream).
2. **When a contender exits / disconnects from a live battle, they are auto-routed to the `/watch` feed** (today they stay on a dead screen).
3. **"X is now live" follow notifications stop being stored, pop down from the top-right, and only stay visible for ~half their current duration** to eliminate clutter.

---

## Changes

### 1. Add Vote + Donate to the live LiveKit arena (`BattleTheater.tsx`)

The live phase currently renders `<LiveKitArena>` plus a tiny overlay with only chat + reactions. The two viewer actions that matter most during a live PK — voting and donating — are missing.

- In `src/pages/BattleTheater.tsx`, inside the `localPhase === 'live' && liveKitCreds` branch, add a new bottom-of-screen action row above the reaction picker:
  - **Vote Barber 1** (orange button, left) — calls existing `handleVote(barber1.id, battle.creation1_id)`; disables + shows ✓ once `userVote === battle.creation1_id`.
  - **Donate** (heart icon, center) — opens existing `DonationModal` for whichever side the user is currently leaning toward; default to a small picker (B1 / B2) so a viewer can tip either contender. Reuse the same `DonationModal` component already used in `ArenaActionBar`.
  - **Vote Barber 2** (cyan button, right) — same pattern as B1.
- Vote buttons honor the existing one-vote-per-user rule; the active side stays highlighted, the other dims.
- Buttons sit in a translucent `bg-black/50 backdrop-blur` pill above the existing `ReactionPicker`, mobile-first sizing (`h-11`, single tap), with safe-area padding.
- `handleVote` already exists and already increments combo + plays sounds + fires haptics — no new logic needed, just wire the buttons.
- Donation modal state (`isDonationOpen`, `donationTarget`) added as local React state at the top of `BattleTheater`.

Result: a live viewer can now Vote, Donate, React, and Chat without leaving the LiveKit arena.

### 2. Contender auto-redirect to feed on exit (`ContenderTheater.tsx`)

`handleEndStream` currently calls `disconnect()` and just sets `phase` back to `'preview'`, leaving the user staring at a dead camera screen. Same goes for unexpected disconnects (`onDisconnect` only shows an error toast).

- In `src/pages/ContenderTheater.tsx`:
  - `handleEndStream` → after `disconnect()` + success toast, call `navigate('/watch', { replace: true })`.
  - `onDisconnect` callback inside `useBattleVideoRoom` → on any disconnect that happens **after** `phase === 'live'` (i.e., the battle was running and ended/dropped), navigate to `/watch` after a 600ms delay so the toast is visible. Don't redirect if disconnect happens during preview/standby (user is just leaving the lobby).
  - Same redirect for the `ContenderTopBar`'s back/X exit if it currently doesn't route — confirm and wire to `/watch` for consistency.
- Use `replace: true` so the back button doesn't bounce them back into a closed battle room.

Result: any time a contender leaves a live battle (via End Stream, opponent drop, network drop, or close), they land in the Watch Feed where the rest of the platform's content lives.

### 3. Live-now notifications: pop down from top-right, don't store, half duration (`useFollowedBarbersNotifications.tsx`)

Today the hook uses the legacy `@/hooks/use-toast` which:
- Has `TOAST_REMOVE_DELAY = 1000000` (~17 min — toasts effectively never auto-clear from state).
- Renders bottom-right via `<Toaster />`.
- Ignores the `duration` prop in our config.
- Stacks (cluttering the screen).

Switch this single notification to **sonner** (already mounted globally, supports proper duration + position):

- In `src/hooks/useFollowedBarbersNotifications.tsx`:
  - Replace `import { toast } from '@/hooks/use-toast'` with `import { toast } from 'sonner'`.
  - Replace the `toast({ title, description, duration })` call with:
    ```ts
    toast(`🔴 ${barberData.name} is LIVE`, {
      description: 'Tap to watch',
      position: 'top-right',
      duration: 5000,           // half of the previous 10000ms
      action: { label: 'Watch', onClick: () => window.location.href = `/broadcast/${barberData.id}` },
    });
    ```
  - Sonner toasts are not persisted in any store — they're transient by design, so closing/refreshing wipes them; nothing is "saved."
- Confirm `<Toaster />` from `sonner` is mounted in `App.tsx` (it is — alongside the legacy one). Pass `position="top-right"` on the sonner Toaster instance if it isn't already so live alerts pop down from the upper right consistently.

Result: live alerts pop down from top-right, auto-dismiss in 5s, never accumulate in any store, never stack into clutter.

---

## Files Touched

| File | Change |
|---|---|
| `src/pages/BattleTheater.tsx` | Add Vote-B1 / Donate / Vote-B2 action row inside the live LiveKit branch; wire `DonationModal` with target picker |
| `src/pages/ContenderTheater.tsx` | Redirect to `/watch` on `handleEndStream` and on post-live disconnect |
| `src/hooks/useFollowedBarbersNotifications.tsx` | Switch from legacy `useToast` to `sonner`, top-right, 5s, transient |
| `src/App.tsx` (small) | Ensure `<Toaster position="top-right" />` from `sonner` is set so live alerts use the correct corner |

## Out of Scope
- Restyling the existing `ArenaActionBar` (used on the showcase feed, not the live LiveKit view).
- Changing the donation amount UI inside `DonationModal`.
- Adding a persistent "live now" inbox — the user explicitly asked for these notifications **not** to be stored.

## Result
- Live viewers can vote + tip without leaving the LiveKit arena.
- Contenders always land back in the Watch Feed after a battle ends or drops, instead of a dead screen.
- "Live now" alerts behave like real push notifications: top-right, 5s, gone — no clutter, no history.