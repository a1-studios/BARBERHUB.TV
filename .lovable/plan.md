

## Quick Book Banner + My Appointments Section

### Overview
Two additions: (1) a dismissible "Quick Book" banner at the top of the Barber Directory highlighting top-rated barbers for fans, and (2) a "My Appointments" section on the fan Profile page showing upcoming and past bookings.

### Changes

| File | Action |
|------|--------|
| `src/components/fan/QuickBookBanner.tsx` | **Create** — Highlighted horizontal scroll of top-rated barbers with "Book Now" CTA |
| `src/pages/BarbersDirectory.tsx` | **Modify** — Insert `QuickBookBanner` above the filters card |
| `src/components/fan/MyAppointments.tsx` | **Create** — Tabbed section showing upcoming vs. past appointments |
| `src/pages/Profile.tsx` | **Modify** — Add `MyAppointments` below `FanProfileHeader` for non-barber users |

---

### 1. `QuickBookBanner.tsx` (New)

A compact, eye-catching banner that appears at the top of the directory page:

- Fetches top 5 barbers from `public_barber_profiles` sorted by `rating DESC` (or `follower_count DESC` as fallback)
- Renders as a gradient card with heading "Top Barbers -- Book Now" and a horizontally scrollable row of mini barber avatars with name + specialty
- Each avatar is clickable and navigates to `/barber/:userId` (the existing `BarberPublicProfile` page where `BookingConsole` is accessible)
- Dismissible via an X button (stores dismissal in `sessionStorage` so it reappears next session)
- Uses `framer-motion` for a subtle slide-in entrance

### 2. `BarbersDirectory.tsx` Changes

- Import and render `QuickBookBanner` between the page header and the filters card
- No other changes needed

### 3. `MyAppointments.tsx` (New)

A self-contained component that queries the `appointments` table:

- Fetches appointments where `client_id = auth.uid()`
- Joins with `barber_profiles` (via `barber_id`) to get barber name and avatar
- Splits into two lists:
  - **Upcoming**: `status IN ('pending', 'confirmed')` and `scheduled_at > now()`, sorted ascending
  - **Past**: everything else, sorted descending, limited to 10
- Uses shadcn `Tabs` component for "Upcoming" / "Past" toggle
- Each appointment card shows: barber name, date/time (formatted with `date-fns`), service type, status badge, and BB escrow amount
- Empty state for each tab ("No upcoming appointments" / "No past appointments")

### 4. `Profile.tsx` Changes

- Import `MyAppointments`
- Render it below the `FanProfileHeader` block (line ~228), only when `!isBarber`:
  ```tsx
  {!isBarber && <MyAppointments />}
  ```
- Placed before `TransactionHistory` for logical flow (appointments > transactions)

