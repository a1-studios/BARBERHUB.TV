## Audit findings

Looking at the screenshot and code, the lobby pilot has these concrete defects:

1. **No way out.** `BattleLobby.tsx` has zero back / leave button. Once a contender enters they are trapped until both lock in.
2. **Podiums look like floating stumps, not chairs.** `ContenderPodium.tsx` only has a stem + small disc seat. There's no backrest, headrest, armrests, or barber-chair silhouette. The "environment" (`ArenaEnvironment.tsx`) is just a grid + two glow rings, which reads as an empty void.
3. **All ContenderTheater controls were removed.** The lobby has only Allow/Lock — there's no camera flip, mic toggle, video on/off, settings, or device picker that contenders had in `ContenderTheater` via `useLocalCameraPreview` + `ContenderControlBar`. The user expects these to be available before they lock in.
4. **Incoming challenge does NOT take over the screen.** Two competing systems are firing:
   - `useNotifications.tsx` (line 116) shows a Sonner toast with a "Respond" action that just opens the bell dropdown.
   - `IncomingChallengeOverlay` exists but its `useEffect` lists `dismissedIds` as a dependency, so every dismiss re-runs the initial scan and re-evaluates against fresh state — and the overlay was never wired to win against the toast.
   The user sees only the small toast, not the full-screen takeover.
5. **"Respond" wording.** Should be "Accept Challenge" / "Decline" — the two distinct buttons the user asked for.
6. **Closing the overlay must keep it in the bell.** Already partially correct (we don't set `dismissed_at` on close), but we DO mark it via `dismissedIds` in-memory. Reload should re-pop it as long as the notification is unread + challenge still pending — that part already works; we just need to make sure clicking the X really does NOT mark it read.

## Plan

### 1. Replace the 3D environment with a proper Barber Arena
**`src/components/lobby/ArenaEnvironment.tsx`** — keep the grid but add:
- Dark wood-tone arena floor disc under both podiums
- A back wall with a subtle neon "VS" mural between the two stations
- Reduce overhead torus rings (they read as random hoops). Replace with a single thin overhead light-bar truss
- Tighter fog so the void doesn't dominate

**`src/components/lobby/ContenderPodium.tsx`** — rebuild as an actual barber chair:
```
       headrest (small cylinder + sphere)
       backrest (rounded box, side-tinted)
       seat (cylinder, leather look)
       armrests (two short cylinders L/R)
       hydraulic stem (existing)
       chrome footring + base disc (existing)
```
Keep the spinning halo + preview bubble behavior exactly as it is today (working well per user).

### 2. Restore contender controls inside the lobby
Mount the existing **`ContenderControlBar`** component (mic toggle, cam toggle, flip camera, settings) anchored at the bottom of the lobby above the FanTerminal, but only visible to contenders. Wire it to the existing `useLobbyCameraPreview` hook by extending that hook with:
- `toggleVideo()` / `toggleAudio()` (enable/disable existing tracks)
- `switchCamera()` (re-acquire `getUserMedia` with `facingMode: 'environment'` ↔ `'user'`)
- `isVideoEnabled`, `isAudioEnabled` flags

### 3. Add a Leave / Back button
Add a small "Leave Lobby" pill in the top-left of `BattleLobby.tsx` (under safe-area-inset-top). Tapping it:
- stops local media (`stopMedia()`)
- if contender, calls `readiness.setReady(false)` so opponent sees them drop
- navigates to `/watch`

### 4. Fix the Incoming Challenge takeover
**`src/hooks/useNotifications.tsx`** — for `challenge_received`:
- Suppress the Sonner toast entirely (the overlay is now the single source of truth).
- Still invalidate the notifications query so the bell updates.

**`src/hooks/useIncomingChallengeOverlay.tsx`** — bug fixes:
- Remove `dismissedIds` from the initial-scan `useEffect` dependency array (currently re-runs on every dismiss).
- Track dismissed IDs in a `useRef` instead of state to avoid effect churn.
- Add a tiny polling fallback (every 30s) so the overlay catches challenges that arrived while the realtime channel was reconnecting.

**`src/components/battles/IncomingChallengeOverlay.tsx`** — copy + UX polish:
- Headline: keep "Incoming Challenge".
- Primary green button: **"Accept Challenge"** (already correct).
- Secondary button: **"Decline"** (already correct).
- Tertiary close (X): keeps the notification unread in the bell, no DB write — already correct, but add tooltip text so it's discoverable: *"Close — review later in the bell"*.
- Slightly larger tap targets for mobile (h-14 accept, h-12 decline).

### 5. Verify the existing accept-flow is intact
`AcceptChallengeModal.tsx` (the bell-dropdown path) already navigates to `/battle/:id/lobby?source=challenge`, and `match-challenge-stake` is unchanged. No edits needed there — both entry points (overlay + bell) end up in the same lobby.

### Files touched

```text
edited  src/components/lobby/ArenaEnvironment.tsx       (warmer arena, wood floor, light truss)
edited  src/components/lobby/ContenderPodium.tsx        (full barber-chair geometry)
edited  src/components/lobby/LobbyScene.tsx             (camera tweak for new chair height)
edited  src/pages/BattleLobby.tsx                       (leave button + mount ContenderControlBar)
edited  src/hooks/useLobbyCameraPreview.tsx             (toggleVideo/Audio + switchCamera)
edited  src/hooks/useNotifications.tsx                  (drop "Respond" toast for challenge_received)
edited  src/hooks/useIncomingChallengeOverlay.tsx       (dep-array fix, ref-based dismiss, polling)
edited  src/components/battles/IncomingChallengeOverlay.tsx (larger tap targets, close tooltip)
```

No DB migrations. No edge function changes. LiveKit / ContenderTheater / BattleTheater / matchmaker / donation splits stay byte-for-byte intact — the lobby is still purely a pre-battle staging surface that hands off to the existing pipeline once both lock in.