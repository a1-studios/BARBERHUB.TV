

# Audit Findings & Master Tier Toggle Plan

## Audit Results

**Defined tiers** (in `barber_subscription_tiers` DB table + `useSubscriptionLimits.tsx`):
- `free` (implicit fallback, 2 battles/mo)
- `bronze` — Bronze Creator, 1000¢/mo, 4 battles
- `silver` — Silver Master, 2500¢/mo, 8 battles
- `gold` — Gold Elite, 5000¢/mo, 16 battles
- `diamond` — referenced in code (TIER_LIMITS, BarbersDirectory filter, TierRing) but **NOT in DB** (orphaned tier — exists in UI only)

**Existing tier-related toggle**: `platform_state.enforce_tiers` (currently `false`) — only restricts map/booking visibility to Silver+. There is **no master ON/OFF for the entire tier system**.

**Tier-coupled UI surfaces** (need conditional gating):
- `BarberSubscriptionTiers.tsx` — pricing cards
- `TierRing.tsx` / `AvatarCrest.tsx` — visual tier rings around avatars
- `BarberPublicProfile.tsx` — tier badges
- `BarbersDirectory.tsx` — tier filter dropdown + tier-priority sort
- `BattleCard.tsx` — tier rings on contenders
- `MyBattlesSection.tsx`, `BarberDashboard.tsx`, `UpgradePrompt.tsx` — upgrade prompts
- `useSubscriptionLimits.tsx` — battle quota gating
- `useStreamingPermissions.tsx` — streaming gate
- `ChallengeFeed.tsx` — Silver+ challenge gate
- `BarberMapDirectory.tsx` — tier-styled pins
- `purchase-product-bb` edge function — tier-gated products

## Implementation Plan

### 1. New platform_state key — `tiers_enabled`
Migration adds row `('tiers_enabled', 'true', ...)` to `platform_state` (default ON for backward compatibility).

### 2. Edge function — extend `sovereign-system-control`
Add two actions: `tiers_enable` / `tiers_disable` that flip `tiers_enabled` and write to `sovereign_audit_log`. Mirror the existing `enforce_tiers_on/off` pattern.

### 3. New hook — `useTiersEnabled()`
Wraps `usePlatformState('tiers_enabled')` + subscribes to Supabase Realtime on `platform_state` table for the `tiers_enabled` row. On change, invalidates the query so all consumers re-render instantly across active sessions.
```ts
const { enabled, loading } = useTiersEnabled(); // boolean, defaults true
```

### 4. Wrap tier-specific UI
Add `if (!tiersEnabled) return null;` (or fallback "Standard" label) in:
- `BarberSubscriptionTiers` → render "Tiers Coming Soon" card
- `TierRing` → render children without tier ring/glow
- `BarbersDirectory` → hide tier filter dropdown, skip tier-priority sort
- `BarberMapDirectory` → uniform pin style (no tier color)
- `BarberPublicProfile` → hide tier badge
- `BattleCard` → plain avatar (no tier ring)
- `UpgradePrompt`, `MyBattlesSection` upgrade CTAs → return null
- `ChallengeFeed` → bypass Silver+ gate when disabled
- `useSubscriptionLimits` → return `isUnlimited: true` when disabled
- `useStreamingPermissions` → grant `canStream: true` when disabled

### 5. Server-side enforcement (security)
Edge functions (`subscribe-with-bb`, `purchase-product-bb`) check `platform_state.tiers_enabled` first — if `false`, return early "Tiers disabled" so the API can't be hit even if UI is bypassed.

### 6. Master Tier Toggle UI — `KillSwitchPanel.tsx`
Add a 5th switch tile labeled **"Tier System"** alongside the existing 4 kill switches. Cyber-industrial styling already matches:
- ON state: Neon Orange (`bg-orange-500`) dot + "ENABLED" label
- OFF state: Dark grey dot + "DISABLED" label
- Confirmation dialog requires typing `DISABLE` / `ENABLE`
- Status pulled from `platform_state.tiers_enabled`

### 7. Realtime broadcast
Enable Supabase Realtime on `platform_state` table (migration: `ALTER PUBLICATION supabase_realtime ADD TABLE platform_state`). `useTiersEnabled` subscribes to `postgres_changes` filtered on `key=eq.tiers_enabled` and invalidates the React Query cache → instant update across all clients without refresh.

### 8. Security
- Toggle write path is gated by existing Sovereign-only checks in `sovereign-system-control` (email + `has_role('sovereign')`).
- Read path is public (anon SELECT on `platform_state` already permitted for `enforce_tiers` reads).

## File Plan

| File | Change |
|------|--------|
| **Migration** | Insert `tiers_enabled='true'` into `platform_state`; add `platform_state` to realtime publication |
| `supabase/functions/sovereign-system-control/index.ts` | Add `tiers_enable` / `tiers_disable` actions |
| `supabase/functions/subscribe-with-bb/index.ts` | Block when `tiers_enabled=false` |
| `supabase/functions/purchase-product-bb/index.ts` | Skip tier check when `tiers_enabled=false` |
| `src/hooks/useTiersEnabled.tsx` | **New** — query + realtime subscription |
| `src/components/sovereign/KillSwitchPanel.tsx` | Add 5th tile: Tier System toggle |
| `src/components/barber/BarberSubscriptionTiers.tsx` | "Coming Soon" fallback when disabled |
| `src/components/TierRing.tsx` | Strip ring when disabled |
| `src/components/AvatarCrest.tsx` | Strip crest when disabled |
| `src/pages/BarbersDirectory.tsx` | Hide filter + skip priority sort |
| `src/components/map/BarberMapDirectory.tsx` | Uniform pin style |
| `src/pages/BarberPublicProfile.tsx` | Hide tier badge |
| `src/components/battles/BattleCard.tsx` | Plain avatars |
| `src/components/barber/UpgradePrompt.tsx` | Return null |
| `src/components/barber/MyBattlesSection.tsx` | Skip upgrade CTA |
| `src/components/battles/ChallengeFeed.tsx` | Bypass Silver+ gate |
| `src/hooks/useSubscriptionLimits.tsx` | Force unlimited when disabled |
| `src/hooks/useStreamingPermissions.tsx` | Force `canStream: true` when disabled |

## Note on `diamond`
`diamond` tier is referenced in code (TIER_LIMITS, BarbersDirectory filter) but doesn't exist in `barber_subscription_tiers`. Out of scope for this toggle — will leave as-is unless you want it cleaned up (separate task).

