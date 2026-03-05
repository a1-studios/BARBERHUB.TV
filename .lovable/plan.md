

## Fix Creator Hub Layout + Add Battle Creation Access

### Problems Identified
1. **Upload zone too large** — The 200px tall dashed upload area dominates 50% of the screen. Should be a compact button.
2. **"CREATOR-HUB" label misaligned** — Should be centered under "BARBER-HUB" and 20% larger text.
3. **No battle creation access** — The existing CreateBattle page exists but isn't accessible from Creator Hub. Need small action buttons (Reddit-style) to section content neatly.

### Changes

| File | Action |
|------|--------|
| `src/pages/CreatorHub.tsx` | **Rewrite layout** — Center "CREATOR-HUB" under "BARBER-HUB" at 20% larger size. Replace full-page sections with compact Reddit-style action pill buttons: "Upload Content", "Create Battle", "Issue Challenge", "Deal Board". Each opens a modal/drawer. |
| `src/components/creator/EducatorUpload.tsx` | **Shrink upload zone** — Replace the 200px dashed box with a small button that triggers file picker. Show preview inline only after file is selected. The form stays compact. Wrap entire component in a Drawer so it opens as a bottom sheet from the action button. |
| `src/components/creator/CreateBattleDrawer.tsx` | **Create** — A Drawer wrapper that contains the battle creation form (extracted from CreateBattle.tsx). Opens from the "Create Battle" pill on Creator Hub. |
| `src/components/creator/CreatorActionBar.tsx` | **Create** — A horizontal row of small pill/chip buttons (Reddit-style): Upload, Battle, Challenge, Deals, Stats. Each triggers its respective modal/drawer. This replaces the current vertical stacking of full sections. |

### Layout Structure (Mobile)
```text
┌────────────────────────────┐
│    ✂️  BARBER-HUB  ⚙️      │  ← Header (existing)
├────────────────────────────┤
│      👑 CREATOR-HUB        │  ← Centered, 20% larger
├────────────────────────────┤
│ [📤 Upload] [⚔️ Battle]    │  ← Action pills row
│ [🔥 Challenge] [💼 Deals]  │  
│ [📊 Stats]                 │
├────────────────────────────┤
│                            │
│  (Feed of barber's own     │
│   published content cards  │
│   — compact list)          │
│                            │
└────────────────────────────┘
```

### Upload Flow Change
- Before: 200px dashed box always visible → takes half the screen
- After: Small "Upload" pill button → tapping opens a Drawer with the compact form (title, category, file picker button, promote toggle, publish)

### Battle Creation Integration
- Extract the form logic from `CreateBattle.tsx` into a reusable component
- Wrap it in a Drawer that opens from the "Create Battle" pill
- Challenge modal already exists (`ChallengeModal.tsx`) — just wire it to the "Challenge" pill
- Deal Board already exists (`SponsorDealBoard.tsx`) — wrap in a Drawer triggered from the "Deals" pill
- Stats drawer already exists (`CreatorStatsDrawer.tsx`) — wire to "Stats" pill

### Key Rules
- All sections are behind small action buttons, not stacked vertically
- The Creator Hub page itself stays clean — just the title, action bar, and a content feed
- Everything fits on one iPhone screen without scrolling past the fold
- Drawers/modals handle all heavy UI (forms, lists)

