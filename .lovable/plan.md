

## Add iOS-Style Bottom Navigation Bar + Global Rankings Page

### Overview
Add a persistent bottom tab bar (iOS-style) across all authenticated pages with 5 tabs: HOME, BATTLES, a protruding orange "+" FAB, RANKINGS, and PROFILE. Create a new Global Rankings page with a podium-style top 3 display, category filter chips, search bar, and "Top Challengers" list — matching the reference design's native iOS feel.

### 1. Create Bottom Navigation Bar Component
**New file: `src/components/BottomNavBar.tsx`**

- Fixed bottom bar with dark background, visible only on mobile (hidden on `md:` and up)
- 5 tab slots: HOME (`/`), BATTLES (`/creator-hub`), center "+" button, RANKINGS (`/rankings`), PROFILE (`/profile`)
- Icons: `Home`, `Swords`, `Plus`, `BarChart3`, `User` from lucide-react
- The "+" button is a large (56px) orange circle that protrudes ~50% above the bar, navigates to `/battles/create` (barbers) or shows a toast for fans
- Active tab highlighted in orange/primary, inactive in muted-foreground
- Uses `useLocation()` to determine active state
- `pb-safe` / `env(safe-area-inset-bottom)` for notched devices

### 2. Create Global Rankings Page
**New file: `src/pages/Rankings.tsx`**

- Header + BottomNavBar layout
- Title: "GLOBAL RANKINGS" with trophy icon
- Tabs: Rankings | Community (start with Rankings active)
- Search bar with filter icon
- Category filter chips (horizontal scroll): Global, Fades, Artistic, Beard, Classic — using the existing `CATEGORIES` config
- **Podium Section** (top 3):
  - Center (#1 "KING") larger avatar with orange border, elevated
  - Left (#2) and Right (#3) smaller, with rank badges
  - Name + star rating below each
- **Top Challengers List** (ranks 4+):
  - Numbered rows with avatar, name, specialty, rating, battle count
  - Dark card backgrounds with orange accents
- Data from `public_barber_profiles` view, sorted by rating

### 3. Add Route for Rankings
**Modified: `src/App.tsx`**
- Add `/rankings` route pointing to the new Rankings page (AuthGuard wrapped)

### 4. Integrate Bottom Nav Globally
**Modified: `src/pages/Index.tsx`, `src/pages/Portal.tsx`, and other authenticated pages**
- Add `<BottomNavBar />` to each authenticated page layout
- Add bottom padding (`pb-20`) to main content so the nav bar doesn't overlap content
- Hide the Footer on mobile since the bottom nav replaces it for primary navigation

### 5. Adjust Existing Layout
- Pages that use Footer: add `pb-20 md:pb-0` to the main content area
- The existing Header stays untouched — this bottom nav is additive

### Files Summary
| File | Action |
|------|--------|
| `src/components/BottomNavBar.tsx` | **Create** — iOS-style bottom tab bar |
| `src/pages/Rankings.tsx` | **Create** — Global Rankings page with podium + challengers |
| `src/App.tsx` | **Modify** — Add `/rankings` route |
| `src/pages/Index.tsx` | **Modify** — Add BottomNavBar, bottom padding |
| `src/pages/Portal.tsx` | **Modify** — Add BottomNavBar, bottom padding |
| `src/pages/Profile.tsx` | **Modify** — Add BottomNavBar |
| `src/pages/CreatorHub.tsx` | **Modify** — Add BottomNavBar |
| `src/pages/BattlesPage.tsx` | **Modify** — Add BottomNavBar |

