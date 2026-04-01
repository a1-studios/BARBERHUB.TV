

# Randomized Hero Videos + Correct Routing + Auto-Scroll on End

## Problem
1. The hero landing page always picks one random video on mount but doesn't rotate — returning users see the same video until a page refresh.
2. When a user clicks the hero video, it navigates with `?video=<url>` which works, but the WatchFeed doesn't auto-advance to the next video when the current one finishes playing.
3. The fallback query picks from the top 10 most recent barbers — not truly random across the full pool.

## Changes

### 1. DynamicBattleHero — Randomized, Rotating Fallback Videos

**File**: `src/components/DynamicBattleHero.tsx`

- Change the `fallbackHeroVideo` query to fetch up to 20 barbers with featured videos (broader pool).
- Instead of picking one random item once, store the full list and rotate through them on a timer (every 8 seconds), shuffled on mount.
- Each rotation shows a different barber's featured video with a smooth crossfade transition using `AnimatePresence`.
- The `onClick` handler already passes `encodeURIComponent(fallbackVideo.featured_video_id)` — this stays correct since it's the actual video URL.

### 2. WatchFeed — Auto-Scroll When Video Ends

**File**: `src/pages/WatchFeed.tsx`

- Add an `onEnded` event handler to the `<video>` element inside `renderVideoItem`.
- When a video finishes playing (`onEnded` fires), programmatically scroll to the next snap item:
  ```tsx
  const handleVideoEnded = (idx: number) => {
    const next = idx + 1;
    if (next < feed.length) {
      const container = containerRef.current;
      const target = container?.querySelector(`[data-index="${next}"]`);
      target?.scrollIntoView({ behavior: 'smooth' });
    }
  };
  ```
- Remove the `loop` attribute from the `<video>` element so `onEnded` actually fires.
- Also wire `onEnded` into the `CloudflareStreamPlayer` path (pass a callback prop or listen on the Stream component's `onEnded`).

### 3. WatchFeed — Shuffle Content Order

**File**: `src/pages/WatchFeed.tsx`

- Before interleaving sponsors/battles into the feed, shuffle the `allContent` array using a Fisher-Yates shuffle so users see a different order each visit.
- This ensures the feed feels fresh without changing the data source.

## Summary of File Changes

| File | Change |
|------|--------|
| `src/components/DynamicBattleHero.tsx` | Store full fallback list, rotate with timer + shuffle, crossfade transitions |
| `src/pages/WatchFeed.tsx` | Remove `loop` from videos, add `onEnded` → auto-scroll to next, shuffle content array |
| `src/components/CloudflareStreamPlayer.tsx` | Add `onEnded` callback prop to pass through to `<Stream>` |

