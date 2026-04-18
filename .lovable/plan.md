

## Issues from screenshots
1. **Mobile split-screen orientation**: Currently vertical (left/right halves) on mobile — cramped. Should stack **horizontally** (top/bottom halves) for mobile portrait → each barber gets full width, much better viewing.
2. **Ghost battle pills**: 4 stacked-pair pills showing under header even though no barbers actually streaming. Query needs tighter filter — must require BOTH `barber1_is_streaming` AND `barber2_is_streaming` AND fresh `updated_at` AND existence in active LiveKit room (best proxy: very recent update, e.g. last 2 minutes, not 30).
3. **Stacked circle icons too big** → shrink ~10%.
4. **Vote buttons** showing blue + purple → must use signature **Neon Orange** (primary) + complementary (we'll use cyan accent for the second side, matching brand: orange = primary action, cyan = secondary).

## Fix Plan

### 1. `src/components/streaming/BattleVideoContainer.tsx` — horizontal split on mobile
Change layout so on mobile (`isMobile`), `split` mode renders **stacked vertically (one on top, one on bottom)** instead of side-by-side. Desktop keeps current side-by-side. Each video gets `w-full h-1/2` on mobile vs `w-1/2 h-full` on desktop.

### 2. `src/components/battles/LiveActivityPill.tsx` — kill ghost pills + smaller icons
- Tighten battle freshness window from **30 min → 2 min** (`updated_at >= now() - 2min`). LiveKit heartbeats refresh `updated_at` constantly during a real stream; 2 min is a hard floor for "actually live right now."
- Add same freshness check to solo broadcasts (already uses `isFreshLiveBroadcast` helper — keep).
- Shrink stacked-pair avatars: `w-9 h-9` → `w-8 h-8` (~11% smaller); container box `60×40` → `54×36`. Solo single circle stays `w-9 h-9` (already correct size).
- Crossed-swords badge: `w-4 h-4` → `w-3.5 h-3.5`.

### 3. DB cleanup migration — clear current ghost battles
Run an UPDATE marking any battle with `status IN ('live','active')` whose `updated_at` is older than 2 minutes as `completed`. This wipes the 4 ghost pills immediately.

Also reset `barber1_is_streaming` / `barber2_is_streaming` to `false` for those rows so they can never satisfy the new pill query.

### 4. Vote buttons — signature colors
Find the vote button component (likely `VotingCard.tsx` or `BattleVotingView.tsx` / `DesktopVoteButtons.tsx` / `MobileVoteCenter.tsx` based on screenshot showing "✓Voted" pills under each barber). Replace blue/purple gradients with:
- **Left barber**: Neon Orange gradient (`from-orange-500 to-orange-600`) — brand primary
- **Right barber**: Cyan gradient (`from-cyan-500 to-cyan-600`) — brand secondary (Zion Blue accent)

This keeps each side visually distinct while staying 100% on-brand (orange + cyan are our two signature colors per memory).

## Files Touched
| File | Change |
|---|---|
| `src/components/streaming/BattleVideoContainer.tsx` | Mobile split → vertical stack (`flex-col` + `h-1/2` each); desktop unchanged |
| `src/components/battles/LiveActivityPill.tsx` | Freshness window 30 min → 2 min; shrink stacked avatars ~10%; smaller swords badge |
| `src/components/battles/BattleVotingView.tsx` (or `VotingCard.tsx` — confirm during impl) | Vote buttons: orange (left) + cyan (right) brand gradients |
| New migration | Mark stale `live`/`active` battles as `completed` + reset `is_streaming` flags |

## Result
- Mobile battle theater: top half = barber 1, bottom half = barber 2 → much larger faces, native PK feel.
- Live pill under header only appears when a stream is genuinely heartbeating in the last 2 minutes — ghost pills gone immediately and stay gone.
- Stacked-pair icons 10% smaller, more refined.
- Vote buttons in signature orange + cyan instead of generic blue/purple.

