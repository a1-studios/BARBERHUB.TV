

## Expand Sovereign HQ: Full Battle Manager + Tournament Queue Control

### Overview
Three major additions to the Sovereign Command Center:
1. **Battle Directory Panel** — browse, inspect, edit, and delete ALL battles inline (no more typing UUIDs)
2. **Tournament Queue Manager** — view/manage the matchmaking queue, manually trigger matchmaker, force matches, remove entries
3. **Tournament Manager** — CRUD tournaments, manage phases, view standings, trigger bracket generation

### Changes

#### 1. Expand `sovereign-battle-control` edge function
Add new actions to the existing edge function:
- `create_battle` — create a battle with all fields (title, category, barbers, dates, type, etc.)
- `edit_battle` — update any field on a battle by ID
- `delete_battle` — hard delete a battle and its votes/submissions/participants
- `get_queue` — fetch tournament_queue entries with filters (status, category)
- `manage_queue` — remove queue entries, change status, force-match two entries
- `get_tournaments` — list all tournaments
- `edit_tournament` — update tournament fields (status, dates, name)
- `create_tournament` — insert a new tournament
- `trigger_matchmaker` — invoke the matchmaker logic inline (same as tournament-matchmaker but on-demand from Sovereign)

#### 2. New component: `src/components/sovereign/BattleDirectoryPanel.tsx`
Full-width section below the existing Battle Orchestration card:
- **Filterable table** of all battles fetched via `get_battles` (status filter tabs: All/Upcoming/Live/Voting/Completed/Cancelled)
- Each row shows: title, category, barber1 vs barber2 names, status badge, dates, battle_type
- **Row actions**: Click to expand details, Edit button (opens pre-filled dialog to change any field), Delete button (with confirmation), all existing quick actions (force status, override winner, reset votes, forfeit) pre-filled with that battle's ID
- **Create Battle button** at the top — opens dialog with full form (title, category, barber1_id, barber2_id, dates, battle_type, etc.)

#### 3. New component: `src/components/sovereign/TournamentQueuePanel.tsx`
Section showing the tournament matchmaking queue:
- **Queue table**: user display_name, category, country_code, status (waiting/matched/expired), queue_timestamp, matched_battle_id
- **Actions per entry**: Remove from queue, change status
- **Manual match**: Select two waiting entries → force-create a battle between them
- **Trigger Matchmaker** button: runs the matchmaker on-demand and shows results
- **Stats header**: waiting count, matched count, per-category breakdown

#### 4. New component: `src/components/sovereign/TournamentManagerPanel.tsx`
Tournament lifecycle control:
- **List all tournaments** with status, dates, participant count
- **Create Tournament** form (name, season, dates, status)
- **Edit Tournament** — change status, dates, etc.
- **View phases** — list tournament_phases, create new phases
- **View standings** — quick glance at tournament_standings for a selected tournament
- **Generate bracket** — trigger the `generate_elimination_bracket` DB function

#### 5. Update `src/pages/SovereignHQ.tsx`
Add the three new panels after the existing control grid:
```
<BattleDirectoryPanel onRefresh={refresh} />
<TournamentQueuePanel onRefresh={refresh} />
<TournamentManagerPanel onRefresh={refresh} />
```

#### 6. Update `BattleControlPanel.tsx`
Keep existing quick-action buttons but enhance: when battles are loaded in BattleDirectoryPanel, the quick-action modals can auto-populate battle_id from a selected battle instead of requiring manual UUID entry.

### Architecture flow
```text
SovereignHQ
├── KillSwitchPanel
├── LivePulseMonitor
├── [EconomyControl | BattleControl | UserControl] (grid)
├── SponsorControlPanel
├── BattleDirectoryPanel        ← NEW (full battle CRUD table)
├── TournamentQueuePanel        ← NEW (queue + matchmaker)
├── TournamentManagerPanel      ← NEW (tournament lifecycle)
└── AuditLogViewer
```

All write actions flow through `sovereign-battle-control` edge function → audit logged → changes are immediately visible throughout the app since all other pages query the same `battles`, `tournament_queue`, and `tournaments` tables directly.

### Technical notes
- No DB schema changes needed — all tables exist (`battles`, `tournament_queue`, `tournaments`, `tournament_phases`, `bracket_matches`, `tournament_standings`)
- The edge function already has sovereign auth + audit logging; new actions follow the same pattern
- All mutations go through the service role key in the edge function, bypassing RLS — this is the sovereign override pattern already established
- The existing matchmaker logic in `tournament-matchmaker` will be invocable from the new panel via `supabase.functions.invoke('tournament-matchmaker')`

