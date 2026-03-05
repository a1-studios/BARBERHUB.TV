

## Fan-Only "Pre-Show" Intro + Viewer Hub

### Overview
Build a cinematic intro sequence for fan/client users that plays the uploaded promo video full-screen, then dissolves into a fan-optimized dashboard. Barbers skip this entirely and land on their existing flow.

### Changes

| File | Action |
|------|--------|
| `public/videos/fan-intro.mp4` | **Copy** uploaded video (`Image_Animation_To_Video.mp4`) here |
| `src/components/fan/FanIntroSequence.tsx` | **Create** — Full-screen video intro component |
| `src/components/fan/FanArenaView.tsx` | **Create** — Fan-only dashboard (no barber tools) |
| `src/pages/Index.tsx` | **Modify** — Branch on role: fans see intro + arena, barbers see existing flow |

---

### 1. `FanIntroSequence.tsx` (New Component)

- Full-screen (`fixed inset-0 z-50 bg-black`) video player with `object-contain`
- Video plays once (no loop), auto-plays muted then unmutes on interaction
- After video `onEnded` (or after 5 seconds via `setTimeout` fallback), triggers `onComplete` callback
- Exit animation: `framer-motion` `AnimatePresence` with `opacity: 0` over 1.2s (the "dissolve")
- Skip button in top-right corner ("Skip Intro") for impatient users
- State: `const [introDone, setIntroDone] = useState(false)` — controlled by parent
- Uses `sessionStorage` key `fan_intro_seen` so it only plays once per session (not on every page refresh)

### 2. `FanArenaView.tsx` (New Component)

A fan-only dashboard with zero barber management tools. Composed of:

- **Grand Prize Ticker** — Reuses `ArenaTicker` with the $25,000 = 93,750 BB conversion displayed prominently
- **Live Battle Feed** — Reuses `LiveBattleFeed` component (vote buttons already gated to voting phase)
- **BB Wallet Widget** — Reuses `BBWalletWidget` showing fan's balance and recent earnings
- **DynamicBattleHero** — Existing hero, already role-aware

Explicitly **excludes**: `ImmersiveFactionBanners`, `CreatorHub` links, battle creation buttons, barber settings. The component renders a "sports broadcast" layout:

```text
┌─────────────────────────────────┐
│  GRAND PRIZE: $25,000 (93,750 BB) │  ← ArenaTicker
├─────────────────────────────────┤
│  [DynamicBattleHero]            │  ← Featured battle
├─────────────────────────────────┤
│  Live Battles Grid              │  ← LiveBattleFeed
│  ┌────┐ ┌────┐ ┌────┐          │
│  │Vote│ │Vote│ │Vote│          │
│  └────┘ └────┘ └────┘          │
├─────────────────────────────────┤
│  BB Wallet    │  Global League  │  ← Side-by-side on desktop
└─────────────────────────────────┘
```

### 3. `Index.tsx` Changes

Replace the single authenticated `<main>` block with a role branch:

```tsx
const { isFan, isBarber, isLoading: roleLoading } = useUserRole();
const [introComplete, setIntroComplete] = useState(false);
const introSeen = sessionStorage.getItem('fan_intro_seen') === 'true';

// Inside the authenticated block:
{isFan && !introComplete && !introSeen ? (
  <FanIntroSequence onComplete={() => {
    setIntroComplete(true);
    sessionStorage.setItem('fan_intro_seen', 'true');
  }} />
) : null}

{isFan ? (
  <FanArenaView />
) : (
  // Existing barber/default dashboard
  <main>
    <WelcomeModal />
    <DynamicBattleHero />
    <ImmersiveFactionBanners />
    ...
  </main>
)}
```

### 4. Visual Style Notes

- Dark background (`bg-black`) for the intro, transitions to the app's existing dark theme
- Neon accent colors via existing `primary` and `orange-400` gradients
- The Grand Prize line uses the same `text-3xl sm:text-5xl font-black` gradient typography from the Arena Ticker
- No new database changes needed — all data sources already exist (`battles`, `category_prize_pools`, `profiles`)

