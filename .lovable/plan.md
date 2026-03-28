

# Play Existing Video Content on Homepage + Feed Fixes

## What changes

### 1. Homepage hero: single-video player when no battles exist
Currently shows a static "No active battles" placeholder. Instead, fetch the first available `featured_video_id` from `public_barber_profiles` and play it in a **single full-width video player** (not split-screen) with audio enabled. When a real VS battle becomes available, the component automatically switches to the existing split-screen layout.

**File: `src/components/DynamicBattleHero.tsx`**
- Replace the empty state (lines 250-258) with a query for the first barber profile that has a valid `featured_video_id`
- Render a single `<video>` element inside the same card container (same aspect ratio, rounded corners, shadow) — NOT full screen
- Set `autoPlay`, `playsInline`, `loop` so something is always playing
- Remove `muted` so audio plays (browsers may block — add a tap-to-unmute overlay as fallback)
- Show the barber name overlay at bottom-left
- Keep the existing VS battle rendering untouched for when `displayBarbers.length >= 2`

### 2. WatchFeed: rename "Sponsored" → "Powered by"
**File: `src/pages/WatchFeed.tsx`**
- Change the sponsor card label from `"Sponsored"` to `"Powered by"`

### 3. WatchFeed: keep endless scrolling structure
The existing interleaved feed with ads, educator content, and battles is already in place. No structural changes needed — just the label rename above.

---

## Technical detail

```text
DynamicBattleHero render logic:
1. Loading? → skeleton
2. Real battle with 2 barbers? → VS split-screen (existing code)
3. No battle? → fetch first featured_video_id → single video player
4. No video either? → static CTA fallback

Single video player container:
- Same wrapper: aspect-video, bg-card, rounded-2xl, shadow-2xl
- <video autoPlay playsInline loop> with tap-to-unmute
- Barber name + flag overlay bottom-left
```

