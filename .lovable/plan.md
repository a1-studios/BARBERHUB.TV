

# Direct Join Queue from Faction Banners

## Overview

When a barber clicks the "Join" button on a faction banner, they will be **immediately registered** for that specific category's tournament queue (no dialog, no category picker needed -- the category is already known). If they don't have enough BB (250), the Add Funds modal opens instead.

## What Changes

### 1. Update `ImmersiveFactionBanners.tsx` -- Add inline registration logic

The parent component gains all the registration logic that currently lives in `TournamentRegistration`, but streamlined for direct action:

- **New queries**: Fetch barber profile (for `id` and `country_code`) and existing queue entries
- **New mutation**: Call `register-tournament-bb` edge function directly when a barber clicks Join
- **New state**: `showAddFunds` boolean + `joiningCategory` to track which category is being processed
- **New callback**: `handleJoinQueue(categoryId)` passed to each `ImmersiveBannerCard` as a separate `onJoin` prop
- **AddFundsModal**: Rendered at the bottom of the component for insufficient balance cases
- **Toast feedback**: Success toast on join, error toast on failure, "already in queue" toast if duplicate

Flow:
1. Barber clicks Join on "Creative Color" banner
2. `handleJoinQueue('creative_color')` fires
3. Checks BB balance (250 required). If insufficient, opens AddFundsModal
4. Checks if already in queue for that category. If yes, shows toast
5. Checks barber profile has country_code. If missing, shows toast to update profile
6. Calls `register-tournament-bb` edge function with `{ category: shortName, barber_profile_id, country_code }`
7. On success: invalidates queries, shows success toast
8. On error: shows error toast

### 2. Update `ImmersiveBannerCard.tsx` -- Separate Join from Select

- Add new `onJoin` callback prop (separate from `onSelect` which navigates to portal)
- The small Join button calls `onJoin(category.shortName)` instead of `onSelect(category.id)`
- The main banner body still calls `onSelect(category.id)` for portal navigation
- Add `isJoining` prop to show a small spinner on the button during registration
- Add `isInQueue` prop to swap the button to a "Queued" badge (green checkmark) when already registered

### 3. Visual States for the Join Button

| State | Button Appearance |
|-------|-------------------|
| Default | Orange pill with Swords icon + "Join" text |
| Hover | Cyan glow effect (existing) |
| Processing | Small spinner replacing icon |
| Already in queue | Green pill with CheckCircle icon + "Queued" |
| Insufficient BB | Opens AddFundsModal (button stays default) |

## Technical Details

### File: `src/components/factions/ImmersiveFactionBanners.tsx`

New imports:
- `useMutation`, `useQuery`, `useQueryClient` from `@tanstack/react-query`
- `supabase` from `@/integrations/supabase/client`
- `useAuth` from `@/hooks/useAuth`
- `useBarberBucks` from `@/hooks/useBarberBucks`
- `AddFundsModal` from `@/components/AddFundsModal`
- `TOURNAMENT_CONFIG` from `@/config/tournament`
- `toast` from `sonner`

New logic in the component:
- `useAuth()` for user ID
- `useBarberBucks()` for balance check
- Query for barber profile (`barber_profiles` table -- `id`, `country_code`)
- Query for existing queue entries (`tournament_queue` table -- same as TournamentRegistration)
- `useMutation` calling `register-tournament-bb` edge function
- `handleJoinQueue(categoryShortName)` function with all validation checks
- State: `showAddFunds`, `joiningCategory`
- Render `AddFundsModal` at the bottom

Pass to each `ImmersiveBannerCard`:
- `onJoin={handleJoinQueue}`
- `isJoining={joiningCategory === category.shortName}`
- `isInQueue={queueEntries?.some(e => e.category === category.shortName)}`

### File: `src/components/factions/ImmersiveBannerCard.tsx`

Updated props interface:
- Add `onJoin?: (categoryShortName: string) => void`
- Add `isJoining?: boolean`
- Add `isInQueue?: boolean`

Updated Join button:
- Calls `onJoin?.(category.shortName)` instead of `onSelect(category.id)`
- Shows `Loader2` spinner when `isJoining` is true
- Swaps to green "Queued" pill with `CheckCircle` icon when `isInQueue` is true
- Disabled when `isJoining` or `isInQueue`

## Files to Modify

| File | Change |
|------|--------|
| `src/components/factions/ImmersiveFactionBanners.tsx` | Add registration logic, queries, mutation, AddFundsModal |
| `src/components/factions/ImmersiveBannerCard.tsx` | Add `onJoin`, `isJoining`, `isInQueue` props; update button states |

No new files. No database changes. No edge function changes -- reuses `register-tournament-bb` as-is.
