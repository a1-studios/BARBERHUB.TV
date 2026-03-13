

## Add Split-Screen Battle Viewer to WatchFeed

### What We're Building
Adding a new `"battle"` feed item type to the existing WatchFeed that renders the provided draggable split-screen UI. Battles with two video URLs (`barber_1_video_url` and `barber_2_video_url`) will appear interleaved in the vertical snap-scroll feed alongside existing video/sponsor/educator items.

### Data Mapping
The `battles` table already has: `barber_1_video_url`, `barber_2_video_url`, `barber1_id`, `barber2_id`, `title`, `category`. We'll fetch active/completed battles that have both video URLs populated, then resolve barber names and country codes from `profiles`.

### Changes

**1. New Component: `src/components/battles/SplitScreenBattle.tsx`**
- Extract the user-provided split-screen code into a standalone component
- Props: `barber1_video`, `barber2_video`, `barber1_name`, `barber1_location`, `barber2_name`, `barber2_location`, `isActive` (controls autoplay), `battleId`
- Maps `barber_1_video_url` → left video, `barber_2_video_url` → right video
- Uses framer-motion drag for the VS divider (already installed)
- Snap thresholds: drag past 80% = fullscreen left, under 20% = fullscreen right, else reset to 50/50
- VOTE buttons appear only when one side is fullscreen (visual only for now)
- Minimize2 escape button to reset split

**2. Update `src/pages/WatchFeed.tsx`**
- Add `"battle"` to the `FeedItem` type union and add battle-specific fields (`barber1_video`, `barber2_video`, `barber1_location`, `barber2_location`, `battle_id`)
- Add a new query to fetch battles with both video URLs:
  ```ts
  supabase.from('battles')
    .select('id, barber_1_video_url, barber_2_video_url, barber1_id, barber2_id, title, category')
    .not('barber_1_video_url', 'is', null)
    .not('barber_2_video_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)
  ```
- Resolve barber names/countries from `profiles` (same pattern as existing video query)
- Interleave battle items into the feed every ~5 items
- In the render loop, when `item.type === "battle"`, render `<SplitScreenBattle>` instead of `renderVideoItem`
- Battle items get full `h-screen` snap slots like everything else

### No Backend Changes
- All existing queries, schemas, auth, and routing remain untouched
- This is purely a new UI component + a new read-only query on the existing `battles` table

### Files
| File | Action |
|------|--------|
| `src/components/battles/SplitScreenBattle.tsx` | Create — split-screen battle viewer component |
| `src/pages/WatchFeed.tsx` | Update — add battle query, interleave battle items, render SplitScreenBattle |

