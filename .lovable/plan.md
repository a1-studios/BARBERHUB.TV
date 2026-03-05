

## Tailor Bottom Nav Bar for Fan/Client Users

### Problem
The current `BottomNavBar` is one-size-fits-all. Fans see a "BATTLES" tab pointing to Creator Hub (barber-only) and a "+" FAB that shows a toast saying "barbers only." This is a dead-end experience for fans.

### Solution
Make the nav bar role-aware. For fans/non-barbers:

| Position | Current | Fan Version |
|----------|---------|-------------|
| Tab 1 | HOME → `/` | HOME → `/` (unchanged) |
| Tab 2 | BATTLES → `/creator-hub` | WATCH → `/watch` (the Watch Feed) |
| Center FAB | + Create Battle | + Book a Barber (opens barber directory) |
| Tab 4 | RANKS → `/rankings` | RANKS → `/rankings` (unchanged) |
| Tab 5 | PROFILE → `/profile` | PROFILE → `/profile` (unchanged) |

### Changes: `src/components/BottomNavBar.tsx`

1. **Define two tab sets** — one for barbers, one for fans:
   - Fan tabs use `Eye` or `Play` icon for "WATCH" (pointing to `/watch`) instead of `Swords` for "BATTLES"
   - Fan FAB navigates to `/barbers` (the BarbersDirectory page) so fans can find and book a barber
   - Fan FAB uses a `CalendarPlus` or `Scissors` icon instead of `Plus` to signal "booking" intent

2. **Select tab set based on role** — use `isBarber` from `useUserRole()` to pick which tabs array to render

3. **Update FAB handler** — for fans, navigate to `/barbers` (the existing barber directory where `BookingConsole` is accessible from each barber's profile)

### Why `/barbers` for the FAB
The booking flow already exists: `BarbersDirectory` → `BarberPublicProfile` → `BookingConsole`. The FAB becomes a fast shortcut to "find a barber to book." No new pages needed.

### Tab Configuration
```typescript
const barberTabs = [
  { icon: Home, label: 'HOME', path: '/' },
  { icon: Swords, label: 'BATTLES', path: '/creator-hub' },
  { isFab: true },
  { icon: BarChart3, label: 'RANKS', path: '/rankings' },
  { icon: User, label: 'PROFILE', path: '/profile' },
];

const fanTabs = [
  { icon: Home, label: 'HOME', path: '/' },
  { icon: Play, label: 'WATCH', path: '/watch' },
  { isFab: true },
  { icon: BarChart3, label: 'RANKS', path: '/rankings' },
  { icon: User, label: 'PROFILE', path: '/profile' },
];
```

Fan FAB: `Scissors` icon, navigates to `/barbers`, aria-label "Book a Barber".

