

# Sovereign HQ — Minimalist Fintech Redesign

## Problem
The current Sovereign HQ uses a cluttered, rainbow-colored design (red, yellow, blue, purple, green, cyan, orange all competing). It looks like a hacker terminal, not a clean fintech dashboard. The user wants a Robinhood-inspired minimalist look using the brand palette: **deep black background**, **orange** (primary accent), **white** (text), and **cyan/Zion blue** (secondary accent).

## Design System

Color tokens used across ALL panels:
- **Background**: `#0a0a0f` (near-black) — page bg
- **Card surface**: `#12121a` — card bg (subtle lift)
- **Card border**: `border-white/[0.06]` — barely visible separation
- **Primary text**: `text-white`
- **Secondary text**: `text-white/40`
- **Stat numbers**: `text-white` (large, clean)
- **Primary accent**: `text-orange-500` — section icons, active badges, primary buttons
- **Secondary accent**: `text-cyan-400` — live indicators, secondary highlights
- **Buttons**: ghost-style with `border-white/10`, white text; primary actions use `bg-orange-500`
- **Danger states**: `text-red-400` only for kill switches — no other red
- **No colored section headers** — all headers are white, icons are orange or cyan

## Files Changed

### 1. `src/pages/SovereignHQ.tsx`
- Change page bg to `bg-[#0a0a0f]`
- Simplify header: remove gradient icon box, use clean `text-white` title with small orange dot indicator
- Remove "GOD MODE ACTIVE" badge, replace with a subtle green dot + "Live" text
- Add a collapsible sidebar nav (or top tab bar) for quick-jumping between sections
- Clean spacing: `space-y-4` instead of `space-y-6`, tighter feel

### 2. `src/components/sovereign/KillSwitchPanel.tsx`
- Card bg `bg-[#12121a]`, border `border-white/[0.06]`
- Remove red border tinting. Use a small red dot indicator for paused state
- Status pills: simple `bg-white/[0.06] text-white/60` when active, `bg-red-500/10 text-red-400` when paused
- Buttons: ghost outline `border-white/10 text-white hover:bg-white/[0.04]`
- Header icon orange, title white

### 3. `src/components/sovereign/LivePulseMonitor.tsx`
- Same card treatment. Stat values in large white `text-2xl font-semibold` (not colored per-stat)
- Labels in `text-white/40 text-xs uppercase tracking-widest`
- Pulse dot uses cyan for the live indicator

### 4. `src/components/sovereign/EconomyControlPanel.tsx`
- Clean card. All stat numbers white. Labels `text-white/40`
- Action buttons: ghost with `border-white/10`, icons in orange
- Modal dialogs: `bg-[#12121a] border-white/[0.06]`, inputs `bg-[#0a0a0f] border-white/10`

### 5. `src/components/sovereign/BattleControlPanel.tsx`
- Same treatment. All stat numbers white. Remove per-stat coloring (green/yellow/red)
- Action buttons uniform ghost style

### 6. `src/components/sovereign/UserControlPanel.tsx`
- Same card/stat treatment
- Search/directory modals get the same dark fintech theme
- Profile inspector modal uses same palette

### 7. `src/components/sovereign/SponsorControlPanel.tsx`
- Remove purple gradient icon box. Use orange icon
- Stats in white, labels muted
- Engagement metrics section: same clean card nesting
- Sponsor list items: `bg-[#0a0a0f] border-white/[0.06]`

### 8. `src/components/sovereign/AffiliateControlPanel.tsx`
- Same fintech card treatment

### 9. `src/components/sovereign/M4MFundPanel.tsx`
- Same treatment. Heart icon in cyan (charity distinction)

### 10. `src/components/sovereign/VaultMetricsPanel.tsx`
- Same treatment

### 11. `src/components/sovereign/BattleDirectoryPanel.tsx`
- Table styling: `bg-[#0a0a0f]` rows, `border-white/[0.06]` separators
- Status badges: small rounded pills, muted colors
- Modals: same dark fintech theme

### 12. `src/components/sovereign/TournamentQueuePanel.tsx`
- Same table/card treatment

### 13. `src/components/sovereign/TournamentManagerPanel.tsx`
- Same treatment

### 14. `src/components/sovereign/AuditLogViewer.tsx`
- Clean log entries with white text, muted timestamps
- Severity indicators: small colored dots (not full icons)

## Design Pattern (applies to every panel)

```text
┌─────────────────────────────────────────────┐
│  ● Section Title                    [Action]│  ← orange dot, white title, ghost button
│                                             │
│  ┌──────┐  ┌──────┐  ┌──────┐              │
│  │ 1,204 │  │   38 │  │   12 │              │  ← big white numbers
│  │ Total │  │ Today│  │ Live │              │  ← muted labels
│  └──────┘  └──────┘  └──────┘              │
│                                             │
│  [Action 1]  [Action 2]  [Action 3]        │  ← ghost bordered buttons
└─────────────────────────────────────────────┘
   bg-[#12121a]  border-white/[0.06]  rounded-xl
```

## Scope
14 files total. All changes are purely visual (className swaps). Zero logic changes. Full CRUD capability is preserved exactly as-is.

