

# Deep-Link Notifications to Specific Appointments + Review Flow Routing

## Problems

1. **Dead routing**: Clicking any appointment notification navigates to `/profile` generically — barbers land on their profile but the "Manage Appointments" collapsible is closed and they have to find the appointment manually.
2. **Completed appointment is a dead end**: When a client gets "Appointment Complete" notification, clicking it goes to `/profile` with no prompt to leave a review. The `review_prompt` notification type (fired by DB trigger `notify_review_prompt`) is also not handled in the UI.
3. **No notification icon mapping for `review_prompt`**: The `NotificationPanel` icon map doesn't include it.

## Plan

### 1. Add query-param-based deep linking on Profile page

**File: `src/pages/Profile.tsx`**

- Import `useSearchParams` from react-router-dom
- Read `?appointment_id=...&action=review` from URL on mount
- If `appointment_id` is present:
  - Auto-open the correct collapsible (`barberApptOpen` for barbers, `apptOpen` for fans)
  - If `action=review`, auto-open the `PostAppointmentReviewModal` with the appointment details (fetch appointment to get `reviewee_id`)
- Add state for `reviewModalOpen`, `reviewAppointmentId`, `revieweeId`, `isBarberReviewing`

### 2. Update notification click routing

**File: `src/components/NotificationPanel.tsx`**

- Update `handleClick` to build smarter URLs:
  - `new_appointment` → `/profile?appointment_id={id}` (opens barber's appointment manager to that item)
  - `appointment_accepted` / `appointment_confirmed` → `/profile?appointment_id={id}`
  - `appointment_completed` / `review_prompt` → `/profile?appointment_id={id}&action=review` (opens review modal)
  - `appointment_denied`, `appointment_cancelled`, `no_show` → `/profile?appointment_id={id}`
- Add `review_prompt` to the icon map (Star icon)

### 3. Update Realtime toast routing

**File: `src/hooks/useNotifications.tsx`**

- Update the toast "View" action to use the same smart URL pattern instead of bare `/profile`
- Route `review_prompt` and `appointment_completed` to `/profile?appointment_id={id}&action=review`

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Profile.tsx` | Read `appointment_id` + `action` search params; auto-open collapsible and review modal |
| `src/components/NotificationPanel.tsx` | Smart URL routing per notification type; add `review_prompt` icon |
| `src/hooks/useNotifications.tsx` | Update Realtime toast action URLs |

