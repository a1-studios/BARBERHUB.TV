

User wants:
1. Rename "Casual Challenges" → **"Quick Play"** everywhere (UI, DB keys, edge actions, switch labels). Keeps tournament/ranked structure pristine — Quick Play is the unranked sandbox.
2. Default the Sovereign switch to **ON** so barbers can challenge right now (still kill-switchable later).
3. Fix the broken flow so: tap Challenge → opens camera/contender room immediately → waits for opponent → opponent accepts via notification → joins same split-screen room.

## Plan

### 1. Platform state keys (default ON this time)
```sql
quick_play_enabled         = 'true'   -- master switch (renamed from casual)
quick_play_feed_publish    = 'false'  -- keep matches out of feed for now
```
Tag rows with `match_mode`:
- `open_challenges.match_mode text default 'quick_play'`
- `battles.match_mode text default 'tournament'` (existing flows insert with `'tournament'`; Quick Play inserts `'quick_play'`)

Feed writers skip `match_mode='quick_play'` until `quick_play_feed_publish='true'`. Tournament brackets/standings never read Quick Play rows.

### 2. New hook — `useQuickPlayConfig.tsx`
Realtime read of both keys (mirrors `useTiersEnabled`).
```ts
{ quickPlayEnabled, feedPublishEnabled, loading }
```

### 3. Fix the broken split-screen room — `ContenderTheater.tsx`
Root cause of "nothing happens": challenger arrives with `barber2_id=null` → profile query is gated on both IDs → "Access Denied".
- Profile query: load whichever of `barber1_id`/`barber2_id` exist.
- Participant check: also accept `battle.organizer_id === user.id` (challenger is always organizer).
- Render "Waiting for opponent…" overlay (existing standby UI) when alone.

### 4. Issuer flow — `ChallengeModal.tsx`
On `create-challenge-stake` success → close modal → `navigate('/battle/{battle_id}/contender')` immediately. Camera opens. They wait.

### 5. Acceptor flow
- `NotificationPanel.tsx` `challenge_received` handler → opens `AcceptChallengeModal` preloaded with the challenge.
- `AcceptChallengeModal.tsx` on accept → `match-challenge-stake` runs (writes `barber2_id`) → `navigate('/battle/{battle_id}/contender')`.

### 6. Edge function gating (Quick Play switch)
- `create-challenge-stake/index.ts`: read `quick_play_enabled`; reject 403 "Quick Play is disabled" when off. Tag inserts `match_mode='quick_play'`.
- `match-challenge-stake/index.ts`: same gate; never write to `tournament_id` / `bracket_matches` / `feed_items`.

### 7. Sovereign HQ — `KillSwitchPanel.tsx`
Add **"Quick Play"** tile (replaces the prior "Casual Challenges" wording):
- Toggle: Enable Quick Play (orange ON / grey OFF) — default ON
- Sub-toggle: Publish to Feed (default OFF, only enabled when master ON)
- Confirmation modal requires typing `ENABLE` / `DISABLE`

### 8. Sovereign actions — `sovereign-system-control/index.ts`
- `quick_play_enable` / `quick_play_disable`
- `quick_play_feed_enable` / `quick_play_feed_disable`

### 9. UI labels
Rename all visible "Casual" / "Challenge" copy in the entry points to **"Quick Play"** so barbers know it's unranked: `ChallengeModal` header, `ChallengeFeed` section title, "Coming Soon" fallback (when off), notification copy.

## File Plan

| File | Change |
|------|--------|
| **Migration** | Rename/insert `quick_play_enabled='true'` + `quick_play_feed_publish='false'`; add `match_mode` cols |
| `src/hooks/useQuickPlayConfig.tsx` | **New** — realtime read of both keys |
| `src/pages/ContenderTheater.tsx` | Allow single-barber load; treat organizer as participant; "Waiting for opponent" overlay |
| `src/components/battles/ChallengeModal.tsx` | Rebrand "Quick Play"; navigate to contender room on success |
| `src/components/battles/AcceptChallengeModal.tsx` | Navigate to contender room on accept |
| `src/components/NotificationPanel.tsx` | `challenge_received` → open AcceptChallengeModal preloaded |
| `src/components/battles/ChallengeFeed.tsx` | "Quick Play" header; gated by `quickPlayEnabled` |
| `src/components/sovereign/KillSwitchPanel.tsx` | "Quick Play" tile + feed-publish sub-toggle |
| `supabase/functions/create-challenge-stake/index.ts` | Gate on `quick_play_enabled`; tag `match_mode='quick_play'` |
| `supabase/functions/match-challenge-stake/index.ts` | Same gate; never touch tournament/feed tables |
| `supabase/functions/sovereign-system-control/index.ts` | 4 new actions for the Quick Play toggles |

## Behavior Summary
- **After deploy (default ON)**: Barber taps Challenge → camera opens (split-screen contender room) → "Waiting for opponent" → target gets realtime notification → taps Accept → joins same room → existing readiness/live state machine runs.
- **Tournament untouched**: Ranked bracket flow, standings, and feed publishing all bypass Quick Play rows.
- **Sovereign can flip Quick Play OFF**: Entry points hide; in-flight challenges expire normally.
- **Sovereign can flip "Publish to Feed" ON**: Quick Play matches start appearing in `/watch`.

