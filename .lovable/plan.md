

# Transparent Bottom Nav, WatchFeed Social Actions & Sponsor Placement

## Summary
Four changes: (1) remove the opaque background from the bottom nav bar for both barbers and fans, (2) add TikTok/Reels-style right-side action icons to WatchFeed videos, (3) wire up barber profile navigation from those icons, (4) add a transparent sponsor ad strip at the bottom of the hero video on the fan home view.

---

## 1. Transparent bottom nav bar
**File: `src/components/BottomNavBar.tsx`**

Remove the opaque card background (`bg-card/95 backdrop-blur-xl border-t border-border/50`). Replace with fully transparent — icons and labels float over content with a subtle text shadow for legibility.

```text
Before: <div class="absolute inset-0 bg-card/95 backdrop-blur-xl border-t border-border/50" />
After:  Remove this div entirely. Add text-shadow / drop-shadow to icons for contrast.
```

The FAB button keeps its `bg-primary` styling. Tab icons get `drop-shadow-lg` for readability over dark/light content.

---

## 2. TikTok-style right-side action buttons on WatchFeed
**File: `src/pages/WatchFeed.tsx`**

Add a vertical stack of floating icon buttons on the right side of each video item (similar to TikTok/IG Reels). No boxes — just bare icons with drop shadows.

Buttons (top to bottom):
- **Creator avatar** (circular, small) — taps navigate to `/barber/:userId`
- **Heart / Coins** (donate) — opens `DonationModal`
- **Share** — native share or copy link
- **Volume toggle** (move existing mute button into this stack)

Each icon: `text-white drop-shadow-lg`, no background box, ~24px size.

---

## 3. Barber profile navigation from WatchFeed
**File: `src/pages/WatchFeed.tsx`**

Currently `FeedItem` has `barber_name` and `creator_avatar` but no `barber_user_id`. Need to add `barber_user_id` (the `user_id` from `public_barber_profiles` or `barber_profiles`) to each feed item so tapping the avatar navigates to `/barber/:userId`.

Changes per query:
- `profileVideos`: add `user_id` from `public_barber_profiles` → map to `barber_user_id`
- `creationVideos`: join `barber_profiles.user_id` → map to `barber_user_id`
- `submissionVideos`: use existing `user_id` field
- `creatorVideos`: use `creator_id`

The avatar icon in the right-side stack becomes: `onClick={() => navigate('/barber/' + item.barber_user_id)}`

---

## 4. Sponsor ad strip on fan home hero video
**File: `src/components/fan/FanArenaView.tsx`** or **`src/components/DynamicBattleHero.tsx`**

Add a transparent sponsor banner at the bottom of the hero video on the fan home page. Show the active sponsor logo + name as a translucent overlay strip (`bg-black/20 backdrop-blur-sm`), matching the glass style used elsewhere. Uses the existing `useSponsorAds` hook to fetch the active sponsor.

---

## Files to modify

| File | Changes |
|------|---------|
| `src/components/BottomNavBar.tsx` | Remove opaque background div, add drop-shadow to icons |
| `src/pages/WatchFeed.tsx` | Add `barber_user_id` to FeedItem, add right-side action icon stack (avatar, donate, share, mute), import DonationModal |
| `src/components/DynamicBattleHero.tsx` | Add transparent sponsor strip overlay at bottom of hero video |

