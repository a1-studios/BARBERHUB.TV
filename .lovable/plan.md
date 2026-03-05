

## Audit Results: Duplicate Battle Creation & Remaining Tier Gates

### Findings

**Duplicate Battle Creation Paths (5 total):**

1. **`/battles/create` page** (`CreateBattle.tsx`) — Full-page form for "unofficial battles" with dates, categories, rules, cover image
2. **ChallengeFeed inline** (presets + custom form) — Creates challenge stakes (100-500 BB) directly in the Challenge Arena modal
3. **BottomNavBar FAB** — Central "+" button navigates to `/battles/create`
4. **BattlesPage button** — "Create Unofficial Battle" links to `/battles/create`
5. **Sovereign BattleDirectoryPanel** — Admin override battle creation (intentional, keep)

Paths 1-4 overlap. The ChallengeFeed creates peer-to-peer challenges, while CreateBattle creates broader "unofficial battles." Both insert into the `battles`/`open_challenges` tables with `battle_type: 'unofficial'`. This creates user confusion about which path to use.

**DEV_MODE bypass status — all frontend gates pass:**
- `useSubscriptionLimits` returns `hasActiveSubscription: true`, `tierName: 'diamond'`, `canCreateBattle: true` ✓
- `isSilverPlus` checks in ChallengeFeed and AcceptChallengeModal resolve to `true` (diamond is in the array) ✓
- Backend edge functions have `DEV_BYPASS = true` ✓

**One redundant gate:** `CreateBattle.tsx` lines 115-123 query the `profiles` table to check `user_type !== 'barber'` and redirect — but `BarberGuard` in the router already handles this. This is unnecessary duplication.

---

### Proposed Changes

| File | Action |
|------|--------|
| `src/pages/CreateBattle.tsx` | **Modify** — Remove the redundant `profiles` query and `user_type` redirect (BarberGuard already does this). Remove the `hasActiveSubscription` gate/paywall UI since DEV_MODE bypasses it anyway — simplify to just show the form directly. |
| `src/components/battles/ChallengeFeed.tsx` | **Modify** — Remove `isSilverPlus` gating on presets, custom form, and accept button. In DEV_MODE these pass anyway, but the Lock overlays and "Silver+ required" messages still render conditionally. Instead, derive `isSilverPlus` from DEV_MODE directly so the lock UI never shows. |
| `src/components/battles/AcceptChallengeModal.tsx` | **Modify** — Same treatment: when DEV_MODE is on, skip showing the "Silver+ required" lock message and disabled state. |
| `src/components/barber/SubscriptionStatusCard.tsx` | **Modify** — When DEV_MODE is active, show "DEV MODE — All features unlocked" instead of tier-specific limits. |

### What stays
- ChallengeFeed and CreateBattle remain as **separate features** (challenges vs. custom battles) — they serve different purposes despite overlap
- Sovereign BattleDirectoryPanel untouched (admin tool)
- BottomNavBar FAB keeps pointing to `/battles/create`
- Backend `DEV_BYPASS` flags unchanged

### Result
With DEV_MODE on, all battle/challenge creation paths will be fully accessible with no lock overlays, no subscription paywalls, and no redundant profile checks. Flipping DEV_MODE to `false` restores all gates.

