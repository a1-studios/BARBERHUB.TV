

# Live Indicator for All Users — Followed Barber Streams with Engagement

## Problem
Fans have no visible indication when a barber they follow goes live. The `LiveBarberStreams` component only shows on the non-fan view, and the `FanArenaView` has no live stream discovery. The toast notification exists but links to the profile page, not the broadcast viewer. There are no donate/like/follow actions on the broadcast cards.

## Changes

### 1. Add Live Streams Section to FanArenaView
**File: `src/components/fan/FanArenaView.tsx`**

Import and render `LiveBarberStreams` prominently at the top of the fan view (right after `DynamicBattleHero`), before the ArenaTicker. This gives fans immediate visibility into who is live.

### 2. Create a New `LiveNowBanner` Component
**File: `src/components/battles/LiveNowBanner.tsx`** (new)

A compact, horizontally-scrollable banner for followed barbers who are currently live. Designed for mobile-first (390px viewport):
- Queries `barber_profiles` where `is_live = true` and the user follows them (`creator_follows`)
- Renders a horizontal scroll of circular avatar thumbnails with a red pulsing ring and barber name
- Tapping navigates to `/broadcast/{barber_profile_id}`
- If no followed barbers are live, falls back to showing ALL live barbers (global discovery)
- Uses Supabase Realtime subscription on `barber_profiles.is_live` for instant updates

### 3. Enhance `LiveBarberStreams` Broadcast Cards with Engagement Actions
**File: `src/components/battles/LiveBarberStreams.tsx`**

Update solo broadcast cards to include:
- **Heart/Like button** — toggles `creator_likes` for that barber
- **Follow button** — toggles `creator_follows`
- **Donate button** — opens `DonationModal` for BB tips
- **Favorite indicator** — filled heart if already liked
- Fetch `barber_profiles.user_id` alongside name/id so engagement mutations can target the correct user

### 4. Fix Toast Notification Link
**File: `src/hooks/useFollowedBarbersNotifications.tsx`**

Update the "View Profile" link in the live notification toast to navigate to `/broadcast/{barber_profile_id}` instead of `/barber/{user_id}`, so fans go directly to the live stream.

Also need to fetch `barber_profiles.id` (the barber profile ID) alongside `user_id` to construct the broadcast URL correctly.

### 5. Add Live Indicator to BottomNavBar
**File: `src/components/BottomNavBar.tsx`**

Add a small red pulsing dot on the HOME tab icon when any followed barber is currently live. Uses a lightweight query: `SELECT count(*) FROM barber_profiles WHERE is_live = true AND user_id IN (followed_ids)`.

## File Summary

| Action | File |
|--------|------|
| New | `src/components/battles/LiveNowBanner.tsx` — horizontal scrollable live avatar strip |
| Edit | `src/components/fan/FanArenaView.tsx` — add LiveNowBanner + LiveBarberStreams |
| Edit | `src/components/battles/LiveBarberStreams.tsx` — add like/follow/donate to broadcast cards |
| Edit | `src/hooks/useFollowedBarbersNotifications.tsx` — fix broadcast link in toast |
| Edit | `src/components/BottomNavBar.tsx` — red dot when followed barbers are live |

No database migrations needed — all tables (`creator_follows`, `creator_likes`, `barber_profiles.is_live`) already exist.

