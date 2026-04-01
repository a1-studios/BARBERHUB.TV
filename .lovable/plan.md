

# Fix Spectator RLS, B2B Educational Gating, and Portfolio Routing Bug

## Step 1: Battle Spectator RLS (Database Migration)

Replace the current `USING (true)` public policy on `stream_sessions` with an authenticated-only policy. Confirm `battles` already allows authenticated reads (it does — verified).

```sql
DROP POLICY IF EXISTS "Anyone can view stream sessions" ON stream_sessions;
CREATE POLICY "Authenticated users can view stream sessions"
  ON stream_sessions FOR SELECT TO authenticated USING (true);
```

## Step 2: B2B Educational Gating (Database + Frontend)

**Database**: Tighten `creator_content` SELECT so `course_teaser` rows require the barber role. Non-course content stays visible to all.

```sql
DROP POLICY IF EXISTS "Content is viewable by everyone" ON creator_content;
CREATE POLICY "Content is viewable by everyone"
  ON creator_content FOR SELECT TO authenticated
  USING (
    content_type != 'course_teaser'
    OR public.has_role(auth.uid(), 'barber')
  );
```

**Frontend** (`WatchFeed.tsx`): Import `useUserRole`, filter out `educator` type items when user `isFan`.

## Step 3: Fix Portfolio Routing Bug (Corrected Approach)

The user correctly identified the flaw: passing any user-level ID (`user_id` or `barber_id`) to `?video=` is wrong because it doesn't uniquely identify which video was clicked. The fix requires passing the actual video identifier and matching on it.

**Current broken flow**:
- `DynamicBattleHero` passes `barber_id` → `?video=<barber_id>`
- `WatchFeed` tries to match against `barber_user_id` (a different field)
- Result: mismatch or no match

**Corrected flow**:
- `DynamicBattleHero` passes the actual video URL: `?video=${encodeURIComponent(fallbackVideo.featured_video_id)}`
- `WatchFeed` matches feed items by `media_url` instead of `barber_user_id`

### Changes in `DynamicBattleHero.tsx`:
```tsx
// Line 312: pass the actual video URL
onClick={() => navigate(`/watch?video=${encodeURIComponent(fallbackVideo.featured_video_id)}`)}
```

### Changes in `WatchFeed.tsx`:
```tsx
// Line 280: match by media_url instead of barber_user_id
const decodedTarget = targetVideoBarber ? decodeURIComponent(targetVideoBarber) : null;

// In the useEffect:
const idx = feed.findIndex(f => f.media_url === decodedTarget);
```

This ensures: User clicks Thumbnail A (with video URL X) → WatchFeed finds the feed item whose `media_url === X` → plays exactly that video.

## Files to Modify

| File | Change |
|------|--------|
| New migration | `stream_sessions` authenticated-only SELECT; `creator_content` course gating |
| `src/components/DynamicBattleHero.tsx` | Pass `featured_video_id` (not `barber_id`) in `?video=` param |
| `src/pages/WatchFeed.tsx` | Match `?video=` param against `media_url`; filter educator items for fans |

