

## Redesign Upgrade Flow — Feature Widget Cards with "Upgrade" Button

### Problem
The current system uses static tier badges ("Bronze", "Silver", "Gold") with verbose "Subscribe for X BB" buttons and multi-step upgrade prompts. The user wants:
1. All features visible and accessible to all barbers (no locks)
2. Tappable feature widget cards that educate barbers on what each tier includes
3. Simple "Upgrade" button — no wordy explanations on the button itself; the icon + card content makes it obvious what they're upgrading to
4. Still prompt barbers to upgrade, but through this new widget-based design

### Changes

| File | Action |
|------|--------|
| `src/components/SubscriptionBadge.tsx` | **Rewrite** — Replace with a tappable badge that opens a `Drawer` (bottom sheet) showing a grid of feature widget cards for each tier. Each card has a clear icon, tier name, key perks, and a single "Upgrade" button. No tooltip; the drawer IS the interaction. Non-interactive mode (battle cards) stays as a small inline badge. |
| `src/components/barber/UpgradePrompt.tsx` | **Rewrite** — Replace the two-step dialog (reason → tiers) with a single Drawer showing the 3 tier widget cards directly. Each card: tier icon, tier name, 3-4 benefit lines, price in BB, and a plain "Upgrade" button. No "View Plans" intermediate step, no "Maybe Later" button. Just close the drawer or tap Upgrade. |
| `src/components/barber/BarberSubscriptionTiers.tsx` | **Simplify** — Change header from "Choose Your Tier" to "Membership Plans". Change button text from "Subscribe for X BB" to just "Upgrade". The icon + card content already explains what the tier is. |
| `src/components/barber/SubscriptionStatusCard.tsx` | **Delete** — Unused (not imported anywhere). Dead code. |

### SubscriptionBadge Drawer Design
```text
┌─────────────────────────────┐
│  ═══  (drag handle)         │
│                             │
│  MEMBERSHIP PLANS           │
│                             │
│  ┌─────────┐ ┌─────────┐   │
│  │ ★       │ │ ✦       │   │
│  │ Bronze  │ │ Silver  │   │
│  │ 50 BB   │ │ 125 BB  │   │
│  │ • 4 bat │ │ • 8 bat │   │
│  │ • 3x vt │ │ • 3x vt │   │
│  │ • Badge │ │ • Prio  │   │
│  │[Upgrade]│ │[Upgrade]│   │
│  └─────────┘ └─────────┘   │
│  ┌─────────┐                │
│  │ 👑      │                │
│  │ Gold    │                │
│  │ 250 BB  │                │
│  │ • Unlim │                │
│  │ • Feat  │                │
│  │[Upgrade]│                │
│  └─────────┘                │
│                             │
│  Balance: 340 BB            │
└─────────────────────────────┘
```

### UpgradePrompt Redesign
- Remove the intermediate "reason" screen with "View Plans" button
- Go directly to the Drawer with the 3 tier widget cards
- Still accepts a `reason` prop to show a small contextual banner at top (e.g., "Battle Limit Reached — upgrade for more battles")
- Button text: just "Upgrade" on each card

### Key Rules
- Button text is always just **"Upgrade"** — the tier icon, name, price, and benefits on the card make it self-explanatory
- All features remain accessible regardless of tier (DEV_MODE still active)
- The upgrade prompt is educational/promotional, not a gate

