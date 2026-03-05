

## Fix: Remove "Create Battle" from Header + Build Comprehensive Battle Creation Drawer

### Problems
1. **Header quick menu** still has "Create Battle" link (line 76-82 in `Header.tsx`) — needs removal
2. **CreateBattleDrawer** is too basic — only has title, category, description, and 3 date pickers
3. The full `CreateBattle.tsx` page has much more (zod validation, max participants, rules, cover image, voting end date) but it's unused since the route redirects to `/creator-hub`

### Changes

| File | Action |
|------|--------|
| `src/components/Header.tsx` | Remove the "Create Battle" quick action (lines 76-82) |
| `src/components/creator/CreateBattleDrawer.tsx` | **Full rewrite** — Absorb all fields from `CreateBattle.tsx` into a scrollable drawer with sectioned layout: **Basic Info** (title, description, category), **Battle Settings** (max participants, streaming type), **Schedule** (submission deadline, starts, ends, voting ends — 4 date pickers), **Prize & Rules** (initial prize pool in BB with info about the jackpot system, rules/guidelines textarea, cover image URL), **Publish Gate** (any barber can draft; premium barbers publish to network; non-premium get UpgradePrompt). Uses react-hook-form + zod validation matching the existing `battleSchema`. Collapsible sections to keep it mobile-friendly. |
| `src/pages/CreateBattle.tsx` | Keep file but it's effectively dead (route already redirects). No changes needed. |

### CreateBattleDrawer Section Layout
```text
┌─────────────────────────────┐
│  ⚔️ CREATE BATTLE            │
│  X battles remaining         │
├─────────────────────────────┤
│ ▼ BASIC INFO                 │
│   Title *                    │
│   Category *                 │
│   Description                │
├─────────────────────────────┤
│ ▼ BATTLE SETTINGS            │
│   Max Participants    [2-64] │
│   Streaming Type   [select]  │
├─────────────────────────────┤
│ ▼ SCHEDULE                   │
│   Submission Deadline        │
│   Starts At                  │
│   Ends At                    │
│   Voting Ends At             │
├─────────────────────────────┤
│ ▼ PRIZE & RULES              │
│   Initial Prize Pool (BB)    │
│   ℹ️ 80/15/5 split info      │
│   Cover Image URL            │
│   Rules & Guidelines         │
├─────────────────────────────┤
│  [ Create & Publish Battle ] │
│  or [Upgrade to Publish]     │
└─────────────────────────────┘
```

### Publish Logic
- All barbers can fill out the form and create a battle (saved as `status: 'upcoming'`, `battle_type: 'unofficial'`)
- The battle is created for any barber — but to have it "propagate" in the network feed, they need premium. Non-premium barbers get the UpgradePrompt when tapping "Publish to Network"
- `prize_amount` defaults to 0 BB but barbers can seed their own BB into the pot (deducted from wallet on creation)

