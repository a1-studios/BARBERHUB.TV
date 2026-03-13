

## Fix Book Appointment Visibility + Surface Bounty System on Profiles

### Issue 1: Book Appointment button visible to other barbers
Currently the "Book Appointment" button on `BarberPublicProfile.tsx` shows for all non-owner visitors, including other barbers. Only fans/clients should see it.

**Fix:** Import `useUserRole` and gate the button behind `!isBarber` in addition to `!isOwner`.

### Issue 2: Bounty system not accessible from either profile
- **Fan profile:** `MyAppointments` (which contains `HouseCallBountyWidget`) is rendered inside a collapsible under "My Appointments" — but only for non-barbers. This works, but bounties are buried inside a tab within that collapsible. It's there but hard to find.
- **Barber profile:** `BarberAppointmentManager` (which contains `BountyBoard`) is **never rendered anywhere**. It's defined but not imported or mounted on any page.

**Fix:** Add `BarberAppointmentManager` as a collapsible section on the barber's Profile page, similar to how "My Appointments" exists for fans. This gives barbers access to their appointment management + the bounty board directly from their profile.

### Changes

| File | Action |
|------|--------|
| `src/pages/BarberPublicProfile.tsx` | Import `useUserRole`, gate Book Appointment behind `!isBarber && !isOwner` |
| `src/pages/Profile.tsx` | Add `BarberAppointmentManager` collapsible for barber profiles under Tools section |

### Detail

**`BarberPublicProfile.tsx`**
- Import `useUserRole` hook
- Destructure `isBarber` from it
- Change line 369 condition from `{!isOwner && (` to `{!isOwner && !isBarber && (` — this hides Follow/Like/Donate/Book from barbers viewing other barbers (per existing convention), OR just wrap the Book Appointment button specifically in `!isBarber`

Actually, looking more carefully: `BarberActionButtons` (Follow, Like, Subscribe, Donate) should remain visible to fans AND barbers visiting other barbers. Only the **Book Appointment** button should be client-exclusive. So we gate just that button:

```tsx
{!isOwner && !isBarber && (
  <Button ...>Book Appointment</Button>
)}
```

Keep the `BarberActionButtons` under `{!isOwner && ...}` as-is.

**`Profile.tsx`**
- Import `BarberAppointmentManager` and add a new collapsible row for barbers (mirroring the appointments collapsible for fans), with a `CalendarDays` icon and "Manage Appointments" label
- Add state `const [barberApptOpen, setBarberApptOpen] = useState(false)`

