

## Remove BattlesPage and Clean Up All References

### Problem
The `/battles` page is a dead-end "No battles yet" screen. User wants it eliminated entirely. The "Watch Battles" in the quick menu already correctly points to `/watch`, but the bottom nav BATTLES tab for barbers and the Header both link to `/battles`.

### Changes

#### 1. Route: Redirect `/battles` to `/watch`
**File**: `src/App.tsx`
- Replace the `BattlesPage` route with `<Navigate to="/watch" replace />`
- Remove the `BattlesPage` import

#### 2. Bottom nav: Change barber BATTLES tab to `/watch`
**File**: `src/components/BottomNavBar.tsx`
- Change barber tab path from `/battles` to `/watch`
- Change icon from `Swords` to `Play` and label to `WATCH` (matches fan tab)

#### 3. Header: Remove "View Battles" nav link
**File**: `src/components/Header.tsx`
- Remove the `battles` entry from the nav links array (lines 60-66)

#### 4. No changes to QuickActionsMenu
The quick menu "Watch Battles" already points to `/watch` — no battle-specific entry exists there to remove.

Note: `/battles/:id` (BattleDetails) and `/battles/create` (redirects to creator-hub) routes remain intact — only the listing page is removed.

### Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | Replace BattlesPage route with redirect to `/watch`, remove import |
| `src/components/BottomNavBar.tsx` | Barber BATTLES tab → WATCH `/watch` |
| `src/components/Header.tsx` | Remove "View Battles" nav link |

