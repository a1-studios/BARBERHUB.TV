

# Show All Available Videos Randomly on the Landing Page

## Problem
The `DynamicBattleHero` component (the main video player on the landing page when no battle is active) only pulls from one source — `public_barber_profiles.featured_video_id` — with a hard limit of 20. This means creator content, portfolio creations, and battle submissions are completely ignored, and users see the same small set of videos repeatedly.

## Solution
Expand the fallback video pool in `DynamicBattleHero` to pull from **all four video sources** (the same ones the Watch Feed uses), remove the artificial limit, shuffle them together, and rotate through the entire pool.

## Changes

### File: `src/components/DynamicBattleHero.tsx`

**1. Replace the single `fallbackHeroVideos` query with four parallel queries:**
- `public_barber_profiles` — featured videos (remove `.limit(20)`, use `.limit(100)`)
- `creator_content` — published creator videos
- `creations` — portfolio upload videos
- `battle_submissions` — battle submission videos

**2. Merge and shuffle all sources into one pool:**
- Combine all four arrays into a unified list with a common shape (`{ id, videoUrl, name, avatarUrl, countryCode }`)
- Apply Fisher-Yates shuffle once on mount (via `useMemo`)
- Remove the `.limit(20)` cap — use a generous limit (100 per source) so all current content is included

**3. Keep existing rotation logic unchanged:**
- The 8-second rotation timer and crossfade animation stay the same
- The `fallbackIdx` counter rotates through the now-larger shuffled pool
- Tapping still navigates to the Watch Feed with the video URL

### Summary of key numbers changing:
- **Before**: ~20 videos from 1 source
- **After**: Up to ~400 videos from 4 sources (in practice, all available content)

No other files need changes — this only affects the hero section on the landing page.

