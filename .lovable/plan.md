

# Unified Barber Profile: One Page, One Experience

## Problem Summary

There are three disconnected views for a barber's content:

1. **`/profile`** (Profile.tsx) -- The iOS-style profile page with avatar, stats, and grouped list items. "Settings" opens BarberSettings, which has a Portfolio tab using `PortfolioManager`. "Public Profile" links to `/barbers/:barberProfile.id` -- but the route expects `/barber/:userId`, so the link is **broken** (404/wrong profile).

2. **`/barber/:userId`** (BarberPublicProfile.tsx) -- The public-facing page with hero, About/Video/Portfolio tabs. Has its own upload and delete UI for portfolio, querying `creations` by `barber_id`.

3. **BarberSettings > Portfolio tab** -- Uses `PortfolioManager` which also queries `creations` by `barberId`. Shows "No media yet" because the component works but the data display is disconnected from uploads done on the public profile page.

**Root causes:**
- Profile.tsx links to `/barbers/${barberProfile.id}` but the route is `/barber/${userId}` -- completely broken link
- Two separate portfolio UIs exist (PortfolioManager and BarberPublicProfile's inline portfolio)
- Username and Country fields are still editable in Settings despite being locked by policy

## Plan: Hybrid Merge

When a barber taps their profile icon, they see the `/profile` page (flag background, centered avatar, iOS grouped list). When they tap "Settings," instead of a separate full-screen Settings view, they go to their **own public profile** at `/barber/:userId` which gains an inline editing panel at the bottom (for the owner only).

### Changes

**1. Fix the "Public Profile" link in Profile.tsx (line 428-429)**
Change `to={'/barbers/${barberProfile.id}'}` to `to={'/barber/${user.id}'}`. This is the critical broken link.

**2. Replace "Settings" button with direct link to own public profile**
Remove the `showBarberSettings` full-screen takeover from Profile.tsx. Instead, the "Settings" button navigates to `/barber/${user.id}?edit=true`. This merges both entry points into one destination.

**3. Add owner editing section to BarberPublicProfile.tsx**
When `isOwner` is true and `?edit=true` query param is present, render a collapsible "Settings" panel below the tabs. This panel contains:
- **Pro tab content** (social links, specialties, location, bio) from BarberSettings
- **Biz tab content** (availability toggles, booking economy) from BarberSettings
- **Privacy tab content** from BarberSettings

The Portfolio tab already has upload/delete in BarberPublicProfile -- that becomes the single source of truth.

**4. Remove BarberSettings full-screen from Profile.tsx**
Delete the `showBarberSettings` state, the conditional render block (lines 165-176), and the Settings button that triggers it. Replace with navigation to `/barber/${user.id}?edit=true`.

**5. Lock username and country fields**
In the owner editing section, show username as read-only text (not an input). Show country as flag + name text, not a dropdown. Show phone/email as locked with "Contact support to change" note.

**6. Remove the "Edit Profile" drawer**
The Edit Profile drawer (BarberProfileForm) is redundant -- all editing happens on the unified profile page. Remove `showEditDrawer` state and the Drawer component from Profile.tsx. Keep the "Edit Profile" button but redirect to `/barber/${user.id}?edit=true`.

**7. Remove PortfolioManager from BarberSettings**
Since BarberSettings is being dismantled, `PortfolioManager` is no longer needed as a separate component. The portfolio UI lives solely in BarberPublicProfile's Portfolio tab.

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Profile.tsx` | Fix public profile link URL, remove BarberSettings full-screen, remove Edit drawer, replace both with navigation to `/barber/:userId?edit=true` |
| `src/pages/BarberPublicProfile.tsx` | Add collapsible owner settings panel (Pro, Biz, Privacy) when `isOwner && edit=true`. Reuse form logic from BarberSettings. |
| `src/components/profiles/BarberSettings.tsx` | Extract Pro/Biz/Privacy form sections into reusable sub-components, or inline them into BarberPublicProfile |

## What stays the same
- The `/profile` page keeps its flag background, centered avatar, stats row, iOS grouped list, BB pill, and all modals
- The public profile page keeps its hero, About/Video/Portfolio tabs
- Portfolio upload/delete stays in BarberPublicProfile's Portfolio tab (already working with delete buttons)
- Fan profile flow is unchanged

