

## Holistic Profile Page Redesign — Unified Plan

This plan consolidates all approved changes into a single implementation scope: the **AvatarCrest system**, the **iOS-native single-screen profile layout**, **compact collapsible sections**, and the **review tag taxonomy sync**.

---

### 1. New Component: `src/components/AvatarCrest.tsx`

A unified SVG-based emblem that replaces `TierRing` + `M4MHeartbeat` on profile pages.

**Structure:**
- Inner circular ring (tier-colored border around the avatar)
- Outer decorative SVG frame — distinct geometry per tier:
  - **Bronze**: Angular chevron wings, copper-orange (`hsl(24,80%,45%)`), 3 small stars
  - **Silver**: Curved laurel branches with leaf details, cool metallic silver (`hsl(210,20%,80%)`), 4 stars
  - **Gold**: Elaborate multi-layered ornate wings, rich gold (`hsl(45,100%,55%)`), 5 stars, particle shimmer
- **Ghost state** (free tier): All outer frame paths at 15% opacity as outlines — aspirational preview of all three tier frames stacked subtly
- **Active state**: Frame fills with tier color, drop-shadow glow, shimmer animations (reuse existing keyframes from `index.css`)
- **M4M heart-shield** embedded at bottom-center of the SVG frame (not a separate component), follows existing 3 states (ghost/certified/complete with Zion Blue)
- Avatar rendered via absolutely positioned div over SVG center (more reliable than `foreignObject`)

**Props:** `tier`, `size` (sm/md/lg), `interactive`, `children` (avatar), `m4mCertified`, `m4mPaid`, `m4mLivesTouched`, `barberName`, `barberUserId`, `isOwnProfile`, `className`

**Interactions:** Tap ring area → membership drawer (internalized from TierRing). Tap M4M heart → certification/QR modals (internalized from M4MHeartbeat).

**Sizes:** sm (~60px for cards), md (~80px), lg (~120px for profile hero)

---

### 2. Rewrite: `src/pages/Profile.tsx` — iOS Single-Screen Layout

Replace the current card-based layout with a centered, single-viewport design.

**Layout (top to bottom, fits one iPhone screen):**

```text
┌─────────────────────────────┐
│ Header (unchanged)          │
├─────────────────────────────┤
│                    [BB pill]│ ← vertical, right-aligned
│      ┌──────────┐           │
│      │ AVATAR   │           │ ← AvatarCrest, centered, lg
│      │ CREST    │           │
│      └──────────┘           │
│      Display Name           │ ← centered text
│      @username · 🇺🇸        │
│      specialty / bio        │
│      [social icons]         │
│                             │
│   ┌──────┬──────┬──────┐    │ ← 3-col stats (compact pills)
│   │Follw │Rating│ BB   │    │
│   └──────┴──────┴──────┘    │
│                             │
│  [Edit] [Settings] [Public] │ ← small pill buttons
│                             │
│  ─── TOOLS ─────────────────│ ← iOS grouped list
│  📋 Recent Transactions   > │ ← Collapsible row
│  📅 My Appointments      > │ ← Collapsible row (role-aware)
│  🏆 Become Sponsor       > │ ← fans only
│  ─── ACCOUNT ───────────────│
│  🔴 Sign Out                │
│  🔴 Delete Account          │ ← subtle red text
│                             │
│  BottomNavBar               │
└─────────────────────────────┘
```

**Key changes:**
- Remove `BarberProfileHeader` and `FanProfileHeader` from this page (keep components for public profile / other pages)
- Build unified centered layout directly — avatar hero with `AvatarCrest`, centered bio/name, stats row, action pills
- BB balance pill: vertical orientation, absolute-positioned right side near avatar to eliminate wasted vertical space
- `TransactionHistory` and `MyAppointments` wrapped in `Collapsible` components (from existing `@radix-ui/react-collapsible`), closed by default, iOS-style list rows with icons
- Edit profile opens existing `BarberProfileForm`/`ClientProfileForm` as a drawer/modal
- Sign Out + Delete Account as subtle list rows at bottom
- Use `min-h-[calc(100dvh-4rem-2.75rem)]` to fit between header and bottom nav
- Fan inline edit (display_name, username, bio) moved into a pop-up drawer instead of inline form

---

### 3. Update: `src/components/analytics/TransactionHistory.tsx`

Add `compact` prop:
- When `compact=true`: no Card/CardHeader wrapper, limit to 5 items, `h-[200px]` ScrollArea, smaller text (`text-xs`), tighter padding (`p-2`)
- Default behavior unchanged for any other usage

---

### 4. Update: `src/components/fan/MyAppointments.tsx`

Add `compact` prop:
- When `compact=true`: no Card/CardHeader wrapper, reduce padding, limit visible upcoming/past to 3 each
- Default behavior unchanged

---

### 5. Update: `src/index.css`

Add keyframes for AvatarCrest:
- `crestWingPulseBronze/Silver/Gold` — wing glow pulse per tier
- `crestShimmerSweep` — shimmer sweep for silver/gold wings
- `crestStarTwinkle` — star twinkle for gold tier
- Reuse existing `tierGlow*` and `tierShimmer` keyframes where possible

---

### 6. Update Other TierRing Consumers

These files continue using `TierRing` (not AvatarCrest) since they're card/small contexts:
- `FeaturedCreatorCard.tsx` — keep TierRing (sm)
- `BattleCard.tsx` — keep TierRing (sm)
- `BookingConsole.tsx` — keep TierRing (sm)
- `BarberProfileCard.tsx` — keep TierRing (sm)
- `BarberPublicProfile.tsx` — replace with AvatarCrest (lg, with M4M)

---

### 7. Sync: `src/config/reviewTags.ts`

Add missing tags from the master prompt:
- **Barber tags (public):** Add `pro-service` (🤝 Pro Service), `messy-station` (🧹 Messy Station), `bad-communication` (🔇 Bad Communication), `rough-handling` (🔪 Rough Handling)
- **Client tags (internal):** Add `frequent-flyer` (🚶‍♂️ Frequent Flyer), `peaceful-client` (🔇 Peaceful Client), `high-maintenance` (🧐 High Maintenance), `aggressive` (😤 Aggressive — rename existing `difficult-client`)

---

### Files Changed Summary

| File | Action |
|------|--------|
| `src/components/AvatarCrest.tsx` | **New** — SVG crest with tier wings + integrated M4M |
| `src/pages/Profile.tsx` | **Rewrite** — iOS single-screen centered layout |
| `src/components/analytics/TransactionHistory.tsx` | **Update** — add `compact` prop |
| `src/components/fan/MyAppointments.tsx` | **Update** — add `compact` prop |
| `src/pages/BarberPublicProfile.tsx` | **Update** — use AvatarCrest instead of TierRing+M4MHeartbeat |
| `src/config/reviewTags.ts` | **Update** — sync tag taxonomy |
| `src/index.css` | **Update** — add crest animation keyframes |
| `src/components/TierRing.tsx` | **Keep** — still used by card-level components |
| `src/components/m4m/M4MHeartbeat.tsx` | **Keep** — standalone use in card contexts |

