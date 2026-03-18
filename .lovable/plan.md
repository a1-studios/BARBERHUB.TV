

## Fix: Unify BB Circulation Metric Across Sovereign HQ

### Root Cause
- **Live Pulse** calls `sovereign-system-control` → `get_platform_stats` (refreshes every 30s)
- **Economy Control** calls `sovereign-economy-control` → `get_stats` (loads once on mount, refreshes on manual trigger)
- Both compute `SUM(profiles.barber_bucks)` independently. Because they fire at different times, the values can diverge — especially after a spin-wheel award or transaction occurs between the two calls.

### Fix
1. **Remove the duplicate metric from Live Pulse** — Economy Control is the authoritative panel for BB supply. Replace the "Total BB" tile in Live Pulse with a more useful real-time metric like "Online Users" or "Active Streams" (or simply remove it).

2. **Ensure Economy Control refreshes with Live Pulse** — Pass the `refreshTrigger` from `SovereignHQ` into `EconomyControlPanel` so it re-fetches when the global refresh button is clicked.

3. **Label consistency** — Rename the Economy Control stat from "Total Supply" to "Total BB in Circulation" to match the underlying query.

### Files Changed

| File | Change |
|------|--------|
| `src/components/sovereign/LivePulseMonitor.tsx` | Replace "Total BB" tile with "Active Streams" (count of battles with status `live` or `streaming`) to avoid duplicate metric |
| `src/pages/SovereignHQ.tsx` | Pass `refreshTrigger` to `EconomyControlPanel` |
| `src/components/sovereign/EconomyControlPanel.tsx` | Accept `refreshTrigger` prop, re-fetch stats when it changes. Update label to "Total BB in Circulation" |

