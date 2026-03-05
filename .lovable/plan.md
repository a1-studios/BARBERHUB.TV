

## Enhance Creator Hub Layout + Unify Battle Creation

### Problems
1. **Desktop padding** — Title too close to header (`pt-6` insufficient on desktop)
2. **Action pills too small** — Need 3-5% size increase with descriptive subtitles
3. **Page feels empty** — Needs more visual life/information density
4. **Battle creation scattered** — Simplified drawer in Creator Hub + full page at `/battles/create` + Quick Actions menu link. Need to consolidate into one comprehensive battle creation experience inside Creator Hub only
5. **Quick Actions menu** still has "Unofficial Battle" link pointing to `/battles/create`

### Changes

| File | Action |
|------|--------|
| `src/components/creator/CreatorActionBar.tsx` | **Rewrite** — Increase pill size (py-3 px-5, text-sm), add short subtitle under each label (e.g. Upload: "Videos & Tips", Battle: "Create & Compete", Challenge: "1v1 Arena", Deals: "Sponsor Board", Stats: "Analytics"). Use a 2-column grid on mobile with the pills as mini cards instead of inline chips. |
| `src/pages/CreatorHub.tsx` | **Modify** — Increase top padding to `pt-10 md:pt-14` for desktop breathing room. Add a subtle gradient accent or decorative element behind the title to give more visual life. |
| `src/components/creator/CreateBattleDrawer.tsx` | **Rewrite** — Replace the simple drawer with the full battle creation form from `CreateBattle.tsx`. Include all fields: title, description, category, max participants, submission deadline, start/end/voting dates, cover image URL, rules & guidelines. Use zod validation. Scrollable drawer with sections. This becomes the **only** place to create unofficial battles. |
| `src/components/QuickActionsMenu.tsx` | **Modify** — Remove the "Unofficial Battle" (`create-battle`) action item from the quick actions array (lines 73-80). Battle creation is now exclusively in Creator Hub. |
| `src/App.tsx` | **Modify** — Redirect `/battles/create` route to `/creator-hub` instead of rendering the CreateBattle page. |

### CreatorActionBar New Layout (Mobile)
```text
┌──────────────┐ ┌──────────────┐
│  📤 Upload   │ │  ⚔️ Battle   │
│ Videos & Tips│ │Create & Host │
└──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐
│  🔥 Challenge│ │  💼 Deals    │
│  1v1 Arena   │ │ Sponsor Board│
└──────────────┘ └──────────────┘
┌──────────────────────────────┐
│        📊 Stats              │
│      Your Analytics          │
└──────────────────────────────┘
```

### Battle Drawer Upgrade
The new `CreateBattleDrawer` absorbs the full `CreateBattle.tsx` form into a scrollable drawer:
- Zod schema validation (title min 3 chars, date ordering)
- All fields: title, description, category, max participants, submission deadline, start date, end date, voting end date, cover image URL, rules
- Subscription tier check with UpgradePrompt
- Battles remaining indicator
- On success: closes drawer and navigates to battle detail page

