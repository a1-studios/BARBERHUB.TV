## Goal
Ship the **3D Pre-Battle Lobby** as a **challenges-only pilot**. Tournament battles, ContenderTheater, BattleTheater, LiveKit publish/subscribe, donation splits, `match-challenge-stake`, and notification routing all stay **byte-for-byte intact**. Only the two challenge entry points get re-routed through the lobby; from the lobby, both contenders land in the existing ContenderTheater (LiveKit) exactly as today.

The reference image (cyber-arena, overhead jumbotron, neon orange + cyan, VS contenders with national flags, crowd silhouette, side stat panels) drives the visual direction.

## Pilot scope

```text
ACCEPTOR clicks "Accept"
   ↓ supabase.functions.invoke('match-challenge-stake')   (UNCHANGED)
   ↓ challenge.completed + battle.status='live'           (UNCHANGED)
   ↓
NEW → /battle/:id/lobby?source=challenge                  ← only changed line
   ↓ contenders Ready Up (3D scene + fan terminal)
   ↓ bothReady === true → 5s countdown
   ↓ /battle/:id/contender                                (UNCHANGED — LiveKit)
```

## Changed files (3 redirect lines + 1 route)

| File | Change |
|---|---|
| `src/components/battles/AcceptChallengeModal.tsx` line 68 | redirect `/contender` → `/lobby?source=challenge` |
| `src/components/battles/ChallengeModal.tsx` line 120 | same redirect swap |
| `src/App.tsx` | Add `<Route path="/battle/:id/lobby" element={<AuthGuard><BattleLobby /></AuthGuard>} />` (lazy import) |

Notification deep-links keep pointing to `/contender` — late joiners and tournament users skip the lobby entirely. Lobby is **opt-in via the challenge accept flow only**.

## New files

| File | Purpose |
|---|---|
| `src/pages/BattleLobby.tsx` | Route page. Loads battle + both barber profiles. Safety guards (see below). Lazy-loads `<LobbyScene>`. Hosts UI overlay |
| `src/components/lobby/LobbyScene.tsx` | R3F `<Canvas dpr={[1,2]} gl={{powerPreference:'high-performance', alpha:false}}>` — cyber arena with two pedestals |
| `src/components/lobby/ArenaEnvironment.tsx` | Dark grid floor (cyan emissive), drei `<Stars>`, fog, slow-rotating overhead torus rings (orange + cyan) — jumbotron motif |
| `src/components/lobby/ContenderPodium.tsx` | 3D pedestal per barber. Holographic ring snaps amber → solid `cyan-400` glow when `is_ready` flips. Profile name + flag mounted via drei `<Html>` |
| `src/components/lobby/CameraRig.tsx` | Camera dolly-in + cursor parallax `lerp`. Disabled on mobile / `prefers-reduced-motion` |
| `src/components/lobby/TiltCard.tsx` | Framer Motion ±8° rotateX/Y cursor-tilt with `transform-style: preserve-3d` |
| `src/components/lobby/ReadyUpPanel.tsx` | Contender-only. Three checks: **Camera**, **Mic**, **Lock-In**. Uses `getUserMedia` for cam/mic verification (releases tracks immediately). Wires Lock-In into existing `useContenderReadiness.setReady`. Cyan-glow border on lock + `AudioManager` SFX + `HapticFeedback` |
| `src/components/lobby/FanTerminal.tsx` | Translucent glass panel (`bg-black/50 backdrop-blur-xl ring-1 ring-cyan-400/30`). Bottom-pinned desktop, swipe-up sheet mobile |
| `src/components/lobby/LiveCommentStream.tsx` | Reuses `useBattleChat(battleId)`. AnimatePresence rows fade up, 12s lifespan, plus inline send box |
| `src/components/lobby/FanActionBar.tsx` | **Follow B1 / Follow B2** (orange) writes to `barber_follows` (existing table). **Predict Winner** (cyan) opens picker → upserts to new `battle_predictions`. **Donate BB** (orange→cyan gradient) opens existing `DonationModal` — routes through `process_battle_donation` RPC unchanged |
| `src/components/lobby/PrizePoolBeacon.tsx` | Wraps existing `AnimatedPrizeCounter`. CSS scale-pulse + cyan shockwave ring on every `pulseTrigger` increment — sibling DOM, never re-renders the 3D scene |
| `src/components/lobby/CountdownLauncher.tsx` | When `bothReady === true`, fires 5s countdown ("5..4..3..FIGHT!"), then `navigate('/battle/:id/contender')` for contenders / `navigate('/battle/:id/theater')` for fans |

## New table (predictions only — separate from `battle_votes`)

```sql
create table if not exists public.battle_predictions (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  user_id uuid not null,
  picked_barber_id uuid not null,
  created_at timestamptz not null default now(),
  unique (battle_id, user_id)
);
create index if not exists battle_predictions_battle_idx on public.battle_predictions(battle_id);
alter table public.battle_predictions enable row level security;
create policy "anyone reads predictions" on public.battle_predictions for select using (true);
create policy "auth users insert own prediction" on public.battle_predictions for insert with check (auth.uid() = user_id);
create policy "users update own prediction" on public.battle_predictions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

`battle_votes` (post-battle, weighted, status-gated by `validate_vote_time` trigger) is untouched. Frontend gracefully no-ops if migration hasn't applied yet (try/catch + toast).

## Real-time data sources (all reused, none modified)

- Readiness: `useContenderReadiness` on `battle-contenders-{id}` presence channel
- Chat: `useBattleChat(battleId)` — fetch + realtime + sendMessage + rate-limit
- Donations realtime: subscribe to `battle_donations` INSERTs filtered by `battle_id` → bumps `pulseTrigger` for beacon shockwave
- Prize pool: read `battles.prize_amount` (already updated by `match-challenge-stake` to `pot_total`)
- Donation flow: existing `DonationModal` → `process_battle_donation` RPC (untouched)

## State machine

```text
[waiting]   opponent not present       →  "Waiting..." over their podium
[present]   both contenders connected
[arming]    ≥1 toggle locked locally
[ready]     bothReady === true         →  fire countdown
[launching] 5s countdown               →  fans + contenders route forward
```

Fan terminal stays interactive through `[waiting]` → `[ready]`; locks at `[launching]`.

## Visual / interaction spec

- Background near-black `#05060A`, cyan grid `#22D3EE` @ 12%.
- **Cyan-400** (`#22D3EE`) reserved for state transitions / locked / shockwaves. **Orange-500** (`#F97316`) stays primary (Follow B1, Donate). Per `mem://design/branding-colors-permanent`.
- Tilt: ±8°, spring `stiffness:150 damping:20`, disabled on `prefers-reduced-motion`.
- Donation pulse: beacon `scale: [1, 1.08, 1]` + cyan ring 0→240% over 700ms.
- Mobile (≤640px): canvas `dpr={[1, 1.5]}`, parallax off, terminal becomes swipe-up sheet (collapsed by default with "Open Arena Chat" handle).

## Performance / Z-index

- Canvas mounted with `frameloop` default (animated, but tightly scoped — `useFrame` only for ring rotations + halo lerp).
- All UI lives in sibling DOM over canvas (NOT inside `<Html>` except 3D-anchored name badges) → chat/buttons never re-render the scene.
- `BattleLobby` lazy-loads `LobbyScene` via `React.lazy` + Suspense fallback (animated cyan loader).

```text
.lobby-canvas         z-0  pointer-events: auto
.lobby-ui-decorative  z-10 pointer-events: none (prize beacon)
.lobby-ui-interactive z-20 pointer-events: auto (ReadyUp, FanTerminal)
.lobby-modal-layer    z-50 pointer-events: auto (DonationModal, Predict picker, Countdown)
```

## Safety guards (challenge-only enforcement)

1. `BattleLobby` mount → if `searchParams.get('source') !== 'challenge'` **OR** the battle row has `tournament_id !== null` → immediately `navigate('/battle/:id/contender', { replace: true })`. Lobby unreachable from tournament path.
2. If `battle.status !== 'live'` → redirect to `/battle/:id/theater`.
3. Late-joining contenders (joining when `bothReady` is already true on mount) → skip directly to `/contender` to avoid re-arming countdown.

## Out of scope

- Tournament path, matchmaker queue, scheduled battles.
- Any change to `match-challenge-stake`, ContenderTheater, LiveKit clients/edge functions.
- Replacing `DonationModal`, follow flow, chat hook, or `useContenderReadiness`.
- Mobile gyroscope tilt (cursor-only for v1).

## Result

A cinematic 3D Pre-Battle Lobby gated **strictly to the challenge accept flow**: contenders walk through Camera/Mic/Lock-In with snappy cyan-glow feedback, fans flood a glassy terminal to chat, follow, predict, and donate while the center prize beacon visibly pulses on every BB hit. When both contenders lock in, a 5s "5..4..3..FIGHT!" countdown hands control to the **existing, unmodified** ContenderTheater + LiveKit pipeline — guaranteeing live battle, donations, and tournament logic stay flawless while we validate the lobby experience on challenges.