## Goal
Polish the 3D Pre-Battle Lobby into a true mobile-native, frictionless experience: skinnier mobile layout, no countdown gate, live self-preview embedded on each podium, in-lobby "Ready Up" controls (camera/mic/speaker/lock-in) that hand off to the existing LiveKit pipeline, and a forced full-screen "Incoming Challenge" pop-up that interrupts whatever the recipient is doing — wherever they are in the app, even on a fresh visit.

The existing tournament, matchmaker, ContenderTheater, BattleTheater, LiveKit, donation split, and notification routing pipelines stay byte-for-byte intact. Only challenge entry points and the lobby itself change.

---

## Pilot scope (still challenges-only)
- Tournament battles → unchanged.
- Challenges (free or staked, direct or open) → go through the polished lobby.
- After both contenders Lock In → instant hand-off to the existing `ContenderTheater` (LiveKit) — no 5s countdown overlay anymore.

---

## What changes

### 1. Mobile layout fixes (lobby viewport ~402×636 case)
File: `src/components/lobby/ReadyUpPanel.tsx`
- Switch top panel from fixed `w-[min(480px,...)]` to `w-[calc(100%-1rem)] max-w-[420px]`, tighter padding (`p-2.5`), smaller heading (`text-[10px]`), tile gap `gap-1.5`, tile padding `py-2`, icons `h-3.5 w-3.5`, label `text-[9px]`. The whole panel must fit comfortably above the prize beacon on a 402px-wide screen with no horizontal overflow.
- Move the panel to `top-2 sm:top-4` so it doesn't crash into the iOS status bar.

File: `src/components/lobby/LobbyScene.tsx`
- Pull the podiums in for mobile so they don't get clipped at the screen edges. Use ~`±2.0` on mobile, `±2.6` on desktop. Tighten camera FOV slightly on mobile (`fov: 55`) and pull camera back (`position: [0, 5.5, 12]`) to fit both podiums in portrait without cropping.
- Drop the floor grid radius slightly to keep horizon visible at 9:16.

File: `src/components/lobby/ContenderPodium.tsx`
- Restyle the pedestal to read more like a barber chair: replace the bottom cylinder + ring with a wider seat-style cylinder + a thin chrome footrest ring. Keep the same colored emissive ring at chair-height for state glow. Keep all existing color logic (orange = present P1, cyan = present P2, bright cyan pulse = ready).

### 2. Live self-preview circle on the podium (hero of the change)
Goal: as soon as a contender allows Camera, a live `<video>` of themselves shows up as a glowing circular bust on top of their podium — and the opponent sees the same circle (with their own preview locally; opponent sees only state, no remote video, since real video transport stays in LiveKit on the next page).

Implementation:
- New component `src/components/lobby/PodiumPreviewBubble.tsx` — a `<Html>` overlay child rendered inside `ContenderPodium` at `position={[0, 1.0, 0]}`. Renders a circular 96px (mobile) / 120px (desktop) frame with a `<video autoplay muted playsinline>` mirrored, ringed by the side color (orange or cyan), with a subtle glow that intensifies when `isReady`.
- The bubble is fed by an optional `MediaStream` prop. It only receives a stream for the *local* contender — the opponent slot shows a placeholder avatar (initials or country flag) until they themselves lock in, at which point the ring switches to bright cyan.
- New hook `src/hooks/useLobbyCameraPreview.tsx` — light wrapper around `navigator.mediaDevices.getUserMedia({ video: true, audio: true })` that:
  - Starts a single shared stream the moment Camera is allowed in `ReadyUpPanel`.
  - Exposes `{ stream, hasCamera, hasMic, hasSpeaker, start, stop, error }`.
  - Stops cleanly on unmount and right before lobby hand-off (so LiveKit can re-acquire devices in `ContenderTheater` without conflict on iOS Safari).
- `BattleLobby.tsx` owns the hook and passes the resulting stream into `LobbyScene` → `ContenderPodium` → `PodiumPreviewBubble` only on the local contender's side.

### 3. Frictionless Ready Up (no countdown wall)
File: `src/components/lobby/ReadyUpPanel.tsx`
- Replace the separate Camera / Mic buttons with a single "Allow Camera + Mic" tile that requests both at once on first tap. On success, both checks flip to ✓ together and the live preview bubble immediately lights up on that contender's podium. The Lock In tile becomes enabled in the same tap.
- Add a third tile: Speaker (auto-checks via `AudioContext` resume on tap; this is what unblocks audio playback for the lobby/LiveKit).
- After tap-to-allow, tile collapses into a tiny status row ("📷 Cam · 🎙 Mic · 🔊 Spk · ✓") to free vertical space.

File: `src/pages/BattleLobby.tsx` and `src/components/lobby/CountdownLauncher.tsx`
- Remove the 5-second full-screen countdown completely. As soon as `bothReady === true`, the lobby triggers a 600ms whoosh transition (a quick ring flash on both podiums + soft camera dolly-in) and navigates straight to `ContenderTheater` (`navigate(/battle/:id/contender, { replace: true })`). Fans go to `/battle/:id/theater`.
- Delete `CountdownLauncher` from the render tree (keep the file or remove — your call; we'll remove the import).

### 4. Forced "Incoming Challenge" full-screen interrupt
Goal: the recipient ALWAYS sees a blocking modal they have to deal with, no matter where they are in the app — even if they were just looking at the feed when the challenge arrived, and even on the very next page load.

New component: `src/components/battles/IncomingChallengeOverlay.tsx`
- A full-screen, app-wide, top-of-everything (`z-[10000]`) takeover with cinematic intro: dark backdrop, animated "INCOMING CHALLENGE" headline, challenger avatar + name + flag, challenge title, stake (or "FREE"), countdown timer to expiry, big green **Accept** and outline **Decline** buttons.
- Accepting reuses the existing `match-challenge-stake` flow and routes to `/battle/:id/lobby?source=challenge`.
- Declining reuses the existing decline path (mark `open_challenges.status = 'declined'`, soft-dismiss the notification).
- An explicit ✕ in the corner closes the overlay BUT the underlying notification remains unread in the bell so the user can come back to it.

Mounting + trigger logic:
- Mount the overlay once globally inside `App.tsx` so it can interrupt any route.
- New hook `src/hooks/useIncomingChallengeOverlay.tsx` that:
  1. On mount and on every auth change, queries `notifications` for the latest unread, non-dismissed `challenge_received` for the current user → if found AND the underlying `open_challenges` row is still `pending` and not expired → shows the overlay. This covers the "they were not in the app when the challenge was sent" case (closing-app-and-coming-back).
  2. Subscribes to realtime `INSERT` on `notifications` for `type=challenge_received` → opens the overlay immediately. This covers the "they're in the app right now" case.
- We will also keep the existing toast and the bell-icon Respond flow unchanged so nothing regresses; the overlay is additive and takes priority.

### 5. Bell continues to work as fallback
- No changes to `useNotifications` or `NotificationPanel`. The bell still shows `challenge_received`. The new overlay just gets there first and is harder to miss.

---

## Files touched

Edit:
- `src/pages/BattleLobby.tsx` — wire `useLobbyCameraPreview`, pass stream to `LobbyScene`, drop countdown, instant nav on `bothReady`, mobile layout tweaks.
- `src/components/lobby/LobbyScene.tsx` — responsive podium spacing + camera FOV/position; pass `localStream` through to `ContenderPodium`.
- `src/components/lobby/ContenderPodium.tsx` — barber-chair styling + render `PodiumPreviewBubble` when stream OR placeholder.
- `src/components/lobby/ReadyUpPanel.tsx` — combined "Allow Cam+Mic" tile, Speaker tile, collapsed status row, tightened mobile sizing, top offset for status bar.
- `src/components/lobby/CountdownLauncher.tsx` — remove from render in lobby (file kept untouched).
- `src/App.tsx` — mount `<IncomingChallengeOverlay />` globally inside the `AuthProvider` tree.

Create:
- `src/components/lobby/PodiumPreviewBubble.tsx`
- `src/hooks/useLobbyCameraPreview.tsx`
- `src/components/battles/IncomingChallengeOverlay.tsx`
- `src/hooks/useIncomingChallengeOverlay.tsx`

Untouched (guaranteed):
- `ContenderTheater.tsx`, `BattleTheater.tsx`, all of `src/hooks/useBattleVideoRoom.tsx`, all `livekit*` lib/edge fns, `process_battle_donation` RPC, donation split (80/15/5), `useNotifications`, `NotificationPanel`, `Header`, `AcceptChallengeModal` (still used by the bell path), tournament/matchmaker code.

---

## QA checklist before shipping
1. On a 402×636 viewport, the Ready Check panel sits cleanly under the iOS status bar with no horizontal scroll, and both podiums are fully visible above the bottom Fan Terminal.
2. Tapping "Allow Camera + Mic" once flips both checks AND lights up a circular live preview of yourself on top of your podium.
3. Tapping Lock In (with opponent already locked) immediately routes both contenders to `ContenderTheater` (LiveKit) — no full-screen countdown.
4. While viewing the watch feed as Barber B, sending Barber B a challenge from another account triggers a full-screen overlay that blocks the feed and offers Accept/Decline.
5. Closing the app and reopening it while a pending `challenge_received` notification exists also pops the overlay on the very first authenticated route.
6. Existing bell-icon Respond flow and Accept modal still function (regression check).
7. After accepting, the donation split during the live battle is still 80% pool / 15% platform / 5% M4M (untouched).