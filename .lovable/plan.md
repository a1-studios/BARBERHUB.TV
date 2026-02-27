

## Convert Country Leaderboard to Vertical Stack Layout

Change the horizontal scrolling carousel into a vertical stacked list — no horizontal overflow, full-width cards, app-native feel.

### `src/components/portal/CountryLeaderboard.tsx`

- **Remove** all horizontal scroll logic: `scrollRef`, `canScrollLeft/Right` state, `checkScroll()`, `scroll()` functions, `ChevronLeft/Right` imports
- **Remove** the gradient fade edge divs (lines 142-144)
- **Remove** the navigation arrow buttons (lines 94-113)
- **Replace** the horizontal flex container (line 117-140) with a vertical `div` using `className="grid gap-4"` (single column, full width)
- **Remove** `flex-shrink-0 w-72` from each card wrapper — cards should be full width
- **Remove** `scrollSnapType`, `scrollSnapAlign`, `overflow-x-auto`, `scrollbar-hide` styles
- **Loading skeleton**: change from horizontal `flex` to vertical `grid gap-4` with full-width skeletons

