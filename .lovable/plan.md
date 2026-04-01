

# Track Creator Content Metrics (Views, Shares)

## Problem
The `CreatorStatsDrawer` reads `views`, `likes`, and `shares` from the `creator_content` table, but nothing ever increments these columns. All stats show zero.

## What Needs to Happen

### 1. Database: RPC functions + likes sync trigger
**New migration**

- **`increment_content_views(p_content_id UUID)`** — SQL function that does `UPDATE creator_content SET views = views + 1 WHERE id = p_content_id`
- **`increment_content_shares(p_content_id UUID)`** — same pattern for shares
- **Trigger on `creator_likes`** — on INSERT, increment `creator_content.likes` for the matching content; on DELETE, decrement. Since `creator_likes` tracks likes by `creator_id` (user ID) not content ID, we increment the aggregate count across all content by that creator. Alternatively, add a simpler approach: when the `CreatorStatsDrawer` fetches stats, also query `COUNT(*)` from `creator_likes` for that creator and use that as the likes count directly (no trigger needed).

Given the `creator_likes` table tracks likes per creator (not per content piece), the cleanest fix is:
- For **likes**: query `creator_likes` count directly in `CreatorStatsDrawer` instead of relying on the denormalized column
- For **views** and **shares**: use RPC increment functions called from the frontend

### 2. WatchFeed: Track views and shares
**File: `src/pages/WatchFeed.tsx`**

- Add a `useRef<Set<string>>` to track which content IDs have been viewed this session
- When a creator content item becomes active (via the intersection observer), extract the real content ID and call `increment_content_views` RPC (once per session per item)
- In `handleShare`, after sharing, call `increment_content_shares` RPC for creator content items

### 3. CreatorStatsDrawer: Fix likes count
**File: `src/components/creator/CreatorStatsDrawer.tsx`**

- Add a separate query to count rows in `creator_likes` where `creator_id = user.id`
- Use that count for the likes stat instead of the denormalized `creator_content.likes` column (which is never updated)

## Files

| File | Action |
|------|--------|
| New migration | `increment_content_views` + `increment_content_shares` RPC functions |
| `src/pages/WatchFeed.tsx` | Call view/share RPCs on content interaction |
| `src/components/creator/CreatorStatsDrawer.tsx` | Query `creator_likes` count for accurate likes |

