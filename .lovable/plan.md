

# Fix WatchFeed: Endless Scroll, All Content Sources, Sponsors & Overlays

## Problem Summary
1. **Only 2 videos exist** in `public_barber_profiles.featured_video_id`. The feed has no other content sources, so it feels empty — not "endless."
2. **Sponsors exist** (3 active with logos in DB) but the interleaving logic only inserts them every 3rd video. With only 2 videos, sponsors may never appear, or appear once at most.
3. **"WATCH" header** takes up space — user wants it removed, just show creator name.
4. **No specialty pills** on the video overlay — user wants translucent pill badges like the Camera Studio UI.

## Plan

### 1. Pull content from ALL available sources
Add queries for additional content tables alongside the existing `public_barber_profiles` query:

| Source | Query | Content type |
|--------|-------|-------------|
| `public_barber_profiles` (existing) | `featured_video_id IS NOT NULL` | `"video"` |
| `creator_content` (NEW) | `status = 'published'`, has `media_url` | `"educator"` or `"video"` based on `content_type` |
| `creations` (NEW) | has `media_url` | `"video"` |
| `battle_submissions` (NEW) | individual submissions with `media_url` starting with `http` | `"video"` (theater mode, NOT split-screen) |
| `battles` (existing) | both video URLs present | `"battle"` (split-screen) |

Each source maps creator name, avatar, and specialty where available. This gives us a much larger pool to build the feed from.

### 2. Fix feed interleaving to always produce content
Current logic: if `videos.length === 0`, it loops platform promos 20 times. Otherwise it interleaves based on video count. The problem is with only 2 videos, sponsors only get 0-1 slots.

New approach:
- Merge ALL content items into a single pool (videos + educator + creations + submissions)
- Shuffle/interleave sponsors every 3-4 items regardless of total count
- If the combined pool is still small, loop/repeat to create at least 20 items for the endless feel
- Battle items (split-screen) interleave every 5-6 items as before

### 3. Sponsor cards: ensure logo renders prominently
The existing sponsor card code already renders `logo_url` — but it only shows when the sponsor item lands in the feed. The fix in step 2 guarantees sponsors appear. Additionally, ensure the sponsor card uses "Powered by" label (already done) and the logo is prominent.

### 4. Remove "WATCH" header bar
Remove the fixed top bar with the back arrow and "WATCH" text. Replace with just a subtle back button (translucent circle) in the top-left corner — no text header.

### 5. Add specialty pill overlays to video items
For each video item, fetch the barber's `specialty` field from `public_barber_profiles`. Render compact translucent pill badges (same style as Camera Studio / SpecialtyPillSelector compact mode) as an overlay near the bottom of the video, above the creator name. Use the existing `getSpecialtyDisplay()` helper from `@/config/specialtyTags` to get emoji + label.

### 6. Enhance creator info overlay
- Show creator name + country flag (already there)
- Show specialty pills below the name (new)
- No client tag for now (per user decision)

## Files to modify

| File | Changes |
|------|---------|
| `src/pages/WatchFeed.tsx` | Add queries for `creator_content`, `creations`, `battle_submissions`; fix interleaving algorithm; remove WATCH header; add specialty pills to video overlay; include `specialty` in video query |

## Technical detail

```text
Feed build algorithm:
1. Collect all content items into allContent[]
2. Shuffle or keep chronological order
3. Build feed[]:
   for each item in allContent:
     push item
     every 3rd item → push next sponsor (cycling)
     every 6th item → push next battle (cycling)
4. If feed.length < 20, loop allContent again with unique IDs
5. Result: always 20+ items with sponsors reliably interleaved
```

Specialty pill overlay markup (per video item):
```text
<div class="absolute bottom-16 left-3 flex gap-1.5 flex-wrap">
  {specialties.map(s => 
    <span class="px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm 
                 text-[10px] text-white/90 border border-white/10">
      {emoji} {label}
    </span>
  )}
</div>
```

