

# In-App Notification Bell + Appointment Notification Wiring

## Current State (Already Done)

The foundation is already built:
- **`notifications` table** exists in Supabase with `id`, `user_id`, `type`, `title`, `message`, `data` (jsonb), `read` (boolean), `created_at`
- **`useNotifications` hook** exists with Realtime subscription, mark-as-read, mark-all-as-read, and unread count
- **`book-appointment` edge function** already inserts a notification for the barber on booking
- **`manage-appointment` edge function** already inserts notifications for the client on accept, deny, complete, cancel, and no-show

What's missing: the notification bell UI is not rendered anywhere. The `useNotifications` hook is never imported by any component.

## Changes Required

### 1. Create NotificationPanel Component
**New file: `src/components/NotificationPanel.tsx`**

A dropdown/sheet component triggered by a Bell icon:
- Bell icon with unread count badge (red dot with number)
- On click, opens a scrollable panel showing recent notifications
- Each notification row: icon by type, title, message, relative time, read/unread styling
- Appointment-related notifications (types: `new_appointment`, `appointment_accepted`, `appointment_denied`, `appointment_completed`, `no_show`) get a special appointment icon and route to the profile/appointments section on click
- "Mark all as read" button at the top
- Clicking a notification marks it as read and navigates based on `data.appointment_id` or `data.battle_id`

### 2. Add Bell to Header
**File: `src/components/Header.tsx`**

- Import `NotificationPanel` and render it in the header bar (next to the BB coin dropdown) for authenticated users
- Shows bell icon with unread badge counter from `useNotifications`

### 3. Add Bell to BottomNavBar (Mobile)
**File: `src/components/BottomNavBar.tsx`**

- Replace or augment one tab (e.g., add a notification bell between RANKS and PROFILE, or overlay a badge on the profile icon)
- Alternative: add bell to Header only since BottomNavBar is minimal — keep it in Header which is visible on mobile too

### 4. Enhance Realtime Toast Actions for Appointments
**File: `src/hooks/useNotifications.tsx`**

- Update the Realtime toast handler to also handle `appointment_id` in notification data (not just `battle_id`)
- When a new appointment notification arrives, the toast "View" button navigates to `/profile` (where MyAppointments lives)

## Files Summary

| File | Action |
|------|--------|
| `src/components/NotificationPanel.tsx` | New — Bell icon + dropdown with notification list |
| `src/components/Header.tsx` | Edit — Add `NotificationPanel` to header |
| `src/hooks/useNotifications.tsx` | Edit — Add appointment routing to toast actions |

No database changes needed — everything is already wired in the edge functions.

