

# Remove Subscribe Button and AI Style Option

## Overview

Remove two features from the platform for all users:
1. **Subscribe button** -- the bell/subscribe action on barber profiles and barber cards
2. **AI Style option** -- the haircut advisor feature across all menus, modals, and pages

---

## Changes

### 1. Remove Subscribe Button from Barber Action Buttons

**File: `src/components/barber/BarberActionButtons.tsx`**

- Remove the Subscribe/Unsubscribe button (lines 190-198) from the action buttons row
- Remove the `subscribeMutation` logic (lines 129-153) and `isSubscribed` query (lines 59-72) since they are no longer needed
- Remove the `Bell` icon import

This removes the Subscribe button from everywhere `BarberActionButtons` is used:
- Barber profile cards in the directory
- Barber public profile page (visitor view)

### 2. Remove Subscriber Count from Stats Displays

**File: `src/components/barber/BarberProfileCard.tsx`**

- Remove the "Subscribers" stat block (lines 270-273) from the stats row
- Remove the `subscribeMutation` and `isSubscribed` logic from the `userRelations` query (lines 79, 85-86) and subscribe mutation (lines 143-167)

**File: `src/pages/BarberPublicProfile.tsx`**

- Remove the "Subscribers" stat block (lines 323-326) from the public profile stats row

### 3. Remove AI Style from Header Quick Actions

**File: `src/components/Header.tsx`**

- Remove the `ai-style` entry (lines 91-97) from the `quickActions` array
- Remove the `Sparkles` icon from the import (line 5)

### 4. Remove AI Style from Floating Quick Actions Menu

**File: `src/components/QuickActionsMenu.tsx`**

- Remove the `ai-style` entry (lines 71-77) from the `quickActions` array
- Remove the `Sparkles` icon from the import (line 11)

### 5. Remove AI Style Advisor Button from Welcome Modal

**File: `src/components/onboarding/WelcomeModal.tsx`**

- Remove the "Try AI Style Advisor" button (lines 121-128) from the fan user actions
- Remove the `Sparkles` icon import

### 6. Remove VirtualHaircutTryOn from Index Page

**File: `src/pages/Index.tsx`**

- Remove both instances of the `<VirtualHaircutTryOn />` component (lines 59 and 79)
- Remove the import statement for `VirtualHaircutTryOn`

### 7. Remove Haircut Advisor Route

**File: `src/App.tsx`**

- Remove the `/haircut-advisor` route (lines 97-104)
- Remove the `HaircutAdvisor` page import (line 18)

---

## What Stays Untouched

- **Barber subscription tiers** (Bronze/Silver/Gold) -- these are the paid barber membership plans, completely separate from the "Subscribe to a barber" social feature being removed
- **Follow and Like buttons** -- remain as the primary social interaction mechanisms
- **Donate button** -- remains for supporting barbers with Barber Bucks
- The haircut advisor page files themselves (`HaircutAdvisor.tsx`, `HaircutAdvisorModal.tsx`, `analyze-haircut` edge function) will remain in the codebase but will be inaccessible -- no navigation paths will lead to them

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/barber/BarberActionButtons.tsx` | Remove Subscribe button and related logic |
| `src/components/barber/BarberProfileCard.tsx` | Remove Subscribers stat and subscribe logic |
| `src/pages/BarberPublicProfile.tsx` | Remove Subscribers stat display |
| `src/components/Header.tsx` | Remove AI Style menu item |
| `src/components/QuickActionsMenu.tsx` | Remove AI Style menu item |
| `src/components/onboarding/WelcomeModal.tsx` | Remove AI Style Advisor button |
| `src/pages/Index.tsx` | Remove VirtualHaircutTryOn component |
| `src/App.tsx` | Remove /haircut-advisor route |

