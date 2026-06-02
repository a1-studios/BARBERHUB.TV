## Goal

Stop the silent "Unauthorized" failures on the challenge edge functions, and make the floating Quick Actions menu visible on iPad and desktop (it currently exists only as a component and is never mounted anywhere).

---

## 1. Fix challenge edge function auth (no more silent 2xx-from-client / 400-from-edge)

**Root cause:** `supabase.functions.invoke('create-challenge-stake' | 'match-challenge-stake')` only attaches the user's JWT when `auth.getSession()` returns a valid, non-expired session. On stale tabs / signed-out users, the SDK sends only the anon key, the edge function calls `supabase.auth.getUser(token)` with the anon key, that fails, and the edge throws `Unauthorized` → caller sees a generic error. Logs confirm this: repeated `Error: Unauthorized at index.ts:27` and `index.ts:26`.

**Client-side hardening** — in every caller (`ChallengeModal.tsx`, `ChallengeFeed.tsx` QuickPresets + CustomForm, `IncomingChallengeTakeover.tsx`, `AcceptChallengeModal.tsx`):
- Before `functions.invoke`, call `await supabase.auth.getSession()`. If no session: toast "Please sign in to issue/accept challenges" and abort.
- Explicitly pass `headers: { Authorization: \`Bearer ${session.access_token}\` }` on the `invoke` call so the token is never silently dropped.

**Edge function hardening** — in `create-challenge-stake/index.ts` and `match-challenge-stake/index.ts`:
- Return a structured `401` with `{ error: 'Sign in required' }` instead of throwing (which currently returns `400`), so the client toast is accurate.
- Log the raw `userError?.message` so future failures show *why* the JWT was rejected (expired vs malformed vs anon-key).

No DB schema changes. No behavior changes for happy-path stake/match flows.

---

## 2. Mount QuickActionsMenu on iPad + desktop

`src/components/QuickActionsMenu.tsx` exists fully built (FAB at top-left, expanding action list) but is never imported. `BottomNavBar` is `lg:hidden` so >=1024px viewports have no quick nav.

- Add `<QuickActionsMenu />` to `src/App.tsx` (inside the auth/router shell, alongside the existing global mounts) so it renders on every route.
- Wrap it in `hidden md:block` so it appears on iPad (>=768px) and desktop, while the existing mobile `BottomNavBar` continues to own <768px.
- No change to `FloatingActionButton`'s `fixed top-6 left-8 z-50` positioning — confirmed it doesn't collide with the existing `Header`.

---

## Files touched

```text
src/App.tsx                                       (mount QuickActionsMenu, md+ only)
src/components/QuickActionsMenu.tsx               (wrap root with hidden md:block)
src/components/battles/ChallengeModal.tsx         (session guard + explicit Bearer)
src/components/battles/ChallengeFeed.tsx          (session guard + explicit Bearer x2)
src/components/battles/IncomingChallengeTakeover.tsx (session guard + explicit Bearer)
src/components/battles/AcceptChallengeModal.tsx   (session guard + explicit Bearer)
supabase/functions/create-challenge-stake/index.ts  (401 + better log on auth fail)
supabase/functions/match-challenge-stake/index.ts   (401 + better log on auth fail)
```

## Out of scope

- Refactoring the broader challenge/battle realtime flow (already addressed last loop).
- Any DB migrations.
- Changing the mobile BottomNavBar.
