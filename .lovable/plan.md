## Root cause

There are two separate role-gates hiding live content from non-fans:

1. **`src/pages/Index.tsx` (line 265)** branches the entire homepage on `isFan`:
   - **Fans** → `<FanArenaView />`, which renders `LiveBattleFeed` ("🔥 Live Battles" section) and the `ArenaTicker` for challenges.
   - **Everyone else (barbers, admins)** → a different layout (`DynamicBattleHero` + shelves + factions + `LiveBarberStreams`) that does **not** include `LiveBattleFeed` or the ArenaTicker challenge surface, so non-fans literally have no entry point for live battles/challenges on the home screen.

2. **`src/components/LiveBattleFeed.tsx`** imports `isBarber` but never uses it to gate the list — that's fine. The real gate is just the parent-component branching above.

The LiveKit viewer-token edge function (`get-livekit-viewer-token`) already accepts any authenticated user regardless of role, and routes like `/battle/:id/theater`, `/watch`, and `/broadcast/:barberId` are wrapped only in `AuthGuard` (no `BarberGuard`/`FanGuard`). So once we fix the homepage gate, all roles can already reach and watch the streams.

## Plan

### 1. Show the same live + challenges surface to every signed-in role

In `src/pages/Index.tsx`:

- Remove the `isFan ? <FanArenaView /> : <main>…</main>` split.
- Render a single unified `<main>` for all authenticated users containing, in order:
  1. `DynamicBattleHero` (already role-aware internally — barbers get challenge CTAs, fans get watch CTAs)
  2. `ProductShelf`
  3. **`ArenaTicker`** (challenges / prize pools) — currently fan-only via FanArenaView, promote it to everyone
  4. **`LiveBattleFeed`** ("🔥 Live Battles") — currently fan-only, promote it to everyone
  5. `ImmersiveFactionBanners`
  6. `GlobalLeagueDashboard`
  7. `LiveBarberStreams`
  8. `CommunitySection` / `GrantsSection` behind their existing feature flags
- Keep the `FanIntroSequence` gated to fans (it's a one-time fan onboarding, not a content surface).
- Delete the now-unused `FanArenaView` import; leave the file in place for now (no functional callers).

### 2. Make `LiveBattleFeed` role-agnostic

- Remove the unused `const { isBarber } = useUserRole();` from `src/components/LiveBattleFeed.tsx` (dead code, was the leftover gate hook).
- No other logic change — `navigate(\`/battles/${id}\`)` already works for all signed-in roles via `AuthGuard`.

### 3. Verify there are no other role walls on the live path

Confirmed read-only (no changes needed, just listing so we don't regress):
- `App.tsx` routes `/battles/:id`, `/battle/:id/theater`, `/watch`, `/broadcast/:barberId` are `AuthGuard`-only (all signed-in users pass).
- `/battle/:id/contender` stays behind `BarberGuard` (barbers only — correct, that's the perform side).
- `get-livekit-viewer-token` edge function requires only a valid Supabase JWT, no role check.
- `BattleTheater` viewer-token fetch already runs whenever `user` exists, no `isFan` condition.

### 4. QA after build

- Sign in as a barber → home screen shows "🔥 Live Battles" and ArenaTicker; tapping a live battle opens `/battles/:id` and `/battle/:id/theater` and connects to LiveKit as a viewer.
- Sign in as a fan → same surfaces visible (no regression).
- Sign in as an admin → same surfaces visible.
- Signed-out → unchanged `VelvetRopeLanding`.

## Files to edit

- `src/pages/Index.tsx` — collapse the `isFan` branch into one unified authenticated layout that includes `LiveBattleFeed` + `ArenaTicker`.
- `src/components/LiveBattleFeed.tsx` — remove the unused `useUserRole`/`isBarber` import.

No DB migrations, no edge-function changes, no new components.