

## Booking Economy Enhancement: Barber BB Settings, Enhanced Review Pills, and Status State Machine

### What Already Exists
- **Booking flow**: Full 3-step wizard (`BookingConsole`), escrow deduction via `book-appointment` edge function, settlement via `manage-appointment`
- **Appointment status enum**: `pending → escrow_locked → confirmed → in_transit → completed → cancelled → no_show → denied`
- **ClientSnapshotWidget**: Already renders on pending appointments in `BarberAppointmentManager`, pulling from `get_client_reputation` RPC (star rating, internal tags, risk flags)
- **Review Pill system**: `PostAppointmentReviewModal` + `recompute_reputation` trigger already working
- **BarberSettings**: Has Profile, Professional, Portfolio, Business, Privacy tabs -- Business tab has placeholder pricing/availability toggles but no BB-specific controls
- **Services**: `barber_services` table already stores `price_bb`, `deposit_bb`, `is_free_intro`

### What's Missing
1. **No barber-level booking economy settings** (deposit toggle, default no-show fee, global service price override)
2. **No no-show fee enforcement** -- `no_show` status exists in enum but no BB deduction logic
3. **ClientSnapshotWidget lacks**: reliability score (show-up rate), user status tier, AI haircut suggestion
4. **manage-appointment edge function** doesn't handle `escrow_locked` state transition or no-show action

---

### Changes

#### 1. Database Migration: Add barber booking settings columns
Add to `barber_profiles`:
- `require_deposit` boolean default true
- `default_no_show_fee_bb` integer default 50
- `booking_message` text nullable (custom message shown to clients)

Add to `client_profiles`:
- `total_appointments` integer default 0
- `no_show_count` integer default 0

These let barbers customize their booking economy and let the Review Pill compute reliability.

#### 2. Add "Booking Economy" section to BarberSettings Business tab
**File**: `src/components/profiles/BarberSettings.tsx`

Insert a new "Booking Economy" card between the existing Availability and Pricing sections in the Business tab:
- **Require Deposit** toggle (on/off) -- maps to `require_deposit`
- **No-Show Fee** number input (BB amount) -- maps to `default_no_show_fee_bb`
- **Custom Booking Message** text input -- maps to `booking_message`
- Save button persists to `barber_profiles`

Load these values from the existing `barberProfile` query and save via `updateBarberMutation`.

#### 3. Enhance ClientSnapshotWidget with Reliability + Status
**File**: `src/components/reviews/ClientSnapshotWidget.tsx`

Add two new data fetches alongside the existing reputation RPC:
- Query `client_profiles` for `total_appointments` and `no_show_count` to compute **Reliability Score** (e.g., `(total - no_shows) / total * 100`%)
- Query `profiles` for `is_verified_by_competition` + `barber_bucks` to derive **User Status** badge ("Elite Voter" if verified, "New Client" if total_appointments < 3, etc.)
- Query `appointments` for the client's most recent `notes` field to show as a mini "Last request" snippet (approximating the AI suggestion without calling the AI endpoint for every appointment view)

Display: a row of pill badges below the star rating: `[95% Reliable] [Elite Voter] [Last: "Fade with line-up"]`

#### 4. Add "no_show" action to manage-appointment edge function
**File**: `supabase/functions/manage-appointment/index.ts`

Add a new `action === 'no_show'` branch:
- Only barber can mark no-show
- Appointment must be `confirmed` or `in_transit`
- Deduct barber's `default_no_show_fee_bb` from client (look up from `barber_profiles`)
- If client has insufficient BB, deduct whatever they have
- Credit the no-show fee to barber (minus 5% platform fee)
- Update `client_profiles.no_show_count` +1 and `total_appointments` +1
- Update appointment status to `no_show`
- Send notification to client

Also update the `complete` action to increment `client_profiles.total_appointments`.

#### 5. Update manage-appointment "accept" to transition through escrow_locked
**File**: `supabase/functions/manage-appointment/index.ts`

When barber accepts (`action === 'accept'`):
- Change status to `escrow_locked` first (credit hold is already done at booking time)
- Then immediately transition to `confirmed`
- Send real-time notification to client (already done)

This ensures the state machine reflects: `pending → escrow_locked → confirmed → completed/no_show`.

#### 6. Update BarberAppointmentManager to support no-show action
**File**: `src/components/booking/BarberAppointmentManager.tsx`

Add a "No-Show" button next to "Mark Complete" for confirmed/in_transit appointments. Uses `manageMutation.mutate({ appointment_id, action: 'no_show' })`.

#### 7. Update useBookAppointment hook
**File**: `src/hooks/useBookAppointment.tsx`

Add `no_show` to the `ManageAppointmentParams.action` union type and add the success message mapping for `no_show` status.

---

### Files Changed

| File | Change |
|------|--------|
| DB migration | Add `require_deposit`, `default_no_show_fee_bb`, `booking_message` to `barber_profiles`; add `total_appointments`, `no_show_count` to `client_profiles` |
| `src/components/profiles/BarberSettings.tsx` | Add "Booking Economy" controls in Business tab |
| `src/components/reviews/ClientSnapshotWidget.tsx` | Add reliability score, user status badge, last request snippet |
| `supabase/functions/manage-appointment/index.ts` | Add `no_show` action, update `complete` to track `total_appointments`, transition through `escrow_locked` on accept |
| `src/components/booking/BarberAppointmentManager.tsx` | Add No-Show button for confirmed appointments |
| `src/hooks/useBookAppointment.tsx` | Add `no_show` action type and success message |

