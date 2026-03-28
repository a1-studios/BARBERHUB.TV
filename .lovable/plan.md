

# Creator Hub Camera CTA + Feed Content Fix

## Problem 1: Videos still showing in split screen
The WatchFeed queries `battle_submissions` (individual uploads) and renders them as `type: "video"` — these are portfolio/content pieces, not VS battles. Meanwhile, actual `battles` with two video URLs correctly render in the 50/50 `SplitScreenBattle`. The screenshot shows what appears to be an "Arena Incoming" placeholder in split view — this is the SplitScreenBattle rendering for a battle entry that may not have valid playable URLs yet.

**Fix**: Filter the `battle_submissions` query to exclude entries linked to active battles (they're individual submissions, not standalone content). Also, only include `battle` items in the feed when both video URLs are actual playable URLs (not null/empty placeholders). Non-VS content stays in single-player theater mode.

**File: `src/pages/WatchFeed.tsx`**
- In the `battle_submissions` query (line 52-57): add a filter to exclude items where the submission is tied to a battle (or rename this feed source to only show portfolio/educator content, not raw battle submissions)
- In the battle items query result mapping (line 141-153): add a guard to only include battles where both URLs start with `http` (valid R2/CDN URLs), filtering out battles that only have placeholder or null video URLs

## Problem 2: Creator Hub needs a camera launch button
The empty state area (lines 106-110 in `CreatorHub.tsx`) currently shows a placeholder text. Replace it with a prominent camera CTA.

**File: `src/pages/CreatorHub.tsx`**
- Replace the placeholder `<div>` (lines 106-110) with a large, visually prominent card that:
  - Uses orange/primary gradient background with a Camera icon
  - Title: "Camera Studio" with subtitle "Set up your gear, test lighting & go live"
  - Full-width, ~50% of remaining viewport height
  - On click: navigates to `/studio`
  - Styled with the existing orange primary color, glowing border effect matching the app aesthetic
  - Below the CTA, keep a smaller secondary area for "Your published content will appear here" as future content feed

## Files to modify

| File | Change |
|------|--------|
| `src/pages/CreatorHub.tsx` | Replace empty state placeholder with Camera Studio CTA button card |
| `src/pages/WatchFeed.tsx` | Filter battle items to only include entries with valid playable URLs; ensure battle_submissions don't render as split-screen |

