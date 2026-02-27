

## Replace Arena Drawer with Centered Popup — 3 Gateway Buttons

### What Changes

The current **Drawer** (bottom sheet) that opens when barbers tap VS/Enter gets replaced with a **centered floating popup** styled like the BB widget card. This popup appears for **all users** (not just barbers), with 3 buttons:

1. **WATCH** — navigates all users to a new vertical scrolling feed page (`/watch`) showing 70% competition/barber videos and 30% ads/sponsor content
2. **BATTLE** — navigates barbers to the battle categories (existing flow via Portal/BattlesPage); fans see a "Barbers Only" tooltip
3. **CHALLENGE** — opens the ChallengeModal for barbers; fans see a "Barbers Only" tooltip

The popup is a 50%-width card centered on screen with backdrop blur, matching the BB widget's gradient border and dark card style.

### Changes

#### 1. Replace Drawer with centered popup in `DynamicBattleHero.tsx`
- Remove the `Drawer`/`DrawerContent` import and usage (lines 618-665)
- Replace with a framer-motion `AnimatePresence` popup (similar pattern to `ChallengeModal` but simpler)
- Popup is a `Card` with `w-[50%]` (desktop) / `w-[85%]` (mobile), centered via fixed positioning
- Contains "ENTER THE ARENA" title + 3 buttons stacked vertically:
  - **WATCH** (Eye icon, cyan accent) — `navigate('/watch')`
  - **BATTLE** (Swords icon, primary accent) — barbers: `navigate('/battles')`, fans: toast "Barbers only"
  - **CHALLENGE** (Flame icon, destructive accent) — barbers: open ChallengeModal, fans: toast "Barbers only"
- Open challenge count badge shown on CHALLENGE button for barbers
- VS tap now opens this popup for ALL users (not just barbers)

#### 2. Create new page `src/pages/WatchFeed.tsx`
- Full-screen vertical scroll feed (TikTok-style)
- Fetches battle submissions (videos) from `battle_submissions` table — these are the 70% competition content
- Every ~3rd item is a sponsor ad card pulled from `sponsor_ads` (the 30% ads/sponsor content)
- Each video item: full-viewport-height card with embedded YouTube player, barber name overlay, vote count
- Each sponsor item: styled card with sponsor name, message, logo, link
- Back button to return home
- Minimalist dark theme, edge-to-edge

#### 3. Add route for `/watch` in `App.tsx`
- New route pointing to `WatchFeed` page

#### 4. Make VS center tappable for fans too
- Currently fans see a static VS; change to a button that opens the same arena popup
- Fans get WATCH as their primary action, BATTLE and CHALLENGE show role-gating

### Technical Details
- Popup uses `createPortal` to `document.body` (same pattern as ChallengeModal) to avoid focus-trap issues
- Popup card: `bg-card border border-cyan/20 shadow-2xl` matching BB widget aesthetic
- WatchFeed interleaves content: for every 2 video items, insert 1 sponsor ad (achieving ~70/30 ratio)
- Videos sourced from `battle_submissions` with `video_url IS NOT NULL`, ordered by recent
- Sponsor ads sourced from existing `useSponsorAds` hook (active only)

