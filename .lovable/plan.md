

## Booking System: House Call Bounty Presets, SOS Cuts & Barber Management

### Phase 1: Database Migration

Create 4 new tables:

**`barber_services`** -- barber defines their service menu
- `id`, `barber_id` (FK barber_profiles.id), `barber_user_id` (FK profiles.user_id), `service_name`, `price_bb` (int), `duration_minutes` (int, default 30), `allows_house_call` (bool default false), `allows_sos` (bool default false), `is_active` (bool default true), `created_at`, `updated_at`

**`barber_availability`** -- weekly schedule
- `id`, `barber_id`, `day_of_week` (0-6), `start_time` (TIME), `end_time` (TIME), `is_available` (bool default true), `slot_duration_minutes` (int default 30), `created_at`

**`appointments`** -- core booking table
- `id`, `client_id` (FK profiles.user_id), `barber_id` (FK barber_profiles.id), `barber_user_id` (FK profiles.user_id), `service_id` (FK barber_services), `appointment_type` (enum: `standard`, `house_call`, `sos`), `status` (enum: `pending`, `escrow_locked`, `confirmed`, `in_transit`, `completed`, `cancelled`, `no_show`, `denied`), `scheduled_at` (timestamptz), `duration_minutes` (int), `escrow_amount_bb` (int), `platform_fee_bb` (int default 0), `client_location_text` (text), `client_lat`/`client_lng` (numeric), `sos_multiplier` (numeric default 1.0), `notes` (text), `denial_reason` (text), `created_at`, `updated_at`

**`barber_blocked_slots`** -- manual blocks + SOS auto-buffers
- `id`, `barber_id`, `blocked_start` (timestamptz), `blocked_end` (timestamptz), `reason` (text), `created_at`

RLS: clients see own appointments, barbers see appointments where they are barber, inserts require auth. Barbers manage own services/availability/blocked slots.

### Phase 2: Edge Functions

**`book-appointment/index.ts`**
1. Validate client BB balance >= amount
2. Enforce minimum: house_call and sos types require >= 500 BB
3. For SOS: multiply base price by 2.0x
4. Deduct BB from client, record as `appointment_escrow` transaction
5. Insert appointment with `status = 'pending'` (barber must accept/deny)
6. For SOS: auto-insert 30-min buffer blocked slots before/after
7. Tier gate: if barber's `active_subscription_tier` is null or 'bronze' (free/low), reject house_call and sos bookings at the edge function level -- return error with upgrade prompt message

**`manage-appointment/index.ts`**
- Barber accepts: status -> `escrow_locked` -> `confirmed`
- Barber denies: status -> `denied`, refund full BB to client, store `denial_reason`
- Barber completes: transfer `escrow - 5% fee` to barber BB, route fee 50/50 to prize pool and platform
- Client cancels: >2hrs = full refund, <2hrs = 50% refund / 50% to barber

### Phase 3: BookingConsole UI

**New file: `src/components/booking/BookingConsole.tsx`**
- Full-screen dialog opened from "Book Appointment" on BarberPublicProfile
- Shows barber avatar, name, tier badge, and client's BB balance at top
- Tri-state toggle: **Standard** | **Emergency SOS** (pulsing orange) | **House Call** (gold)

**Standard mode:**
- Service dropdown from `barber_services`
- Horizontal 14-day date scroller
- Time slot grid (computed from availability minus blocks minus existing appointments)
- Price in BB

**SOS mode:**
- "Next Available" single slot display
- Price = base * 2.0x, minimum 500 BB
- Single-tap "Instant Book"

**House Call mode:**
- Three quick-pick bounty buttons: **750 BB** | **1,200 BB** | **2,000 BB**
- Custom amount input below with "Min 500 BB" label and validation
- Location text input for client address
- Service selector

**Escrow confirm dialog** before final commit showing: service, amount, balance before/after

### Phase 4: Tier-Gating on Client Side

When client views a barber's profile and selects House Call or SOS:
- If barber is **free or Bronze tier**: the bounty/SOS options are **visible but locked** with a message: "This barber needs to upgrade to Silver+ to accept House Calls / SOS cuts"
- If barber is **Silver or Gold**: full access to house call and SOS booking

When a **low-tier barber** sees incoming bounties in their dashboard, they see the bounty list but clicking "Accept" triggers the `UpgradePrompt` modal with `reason: 'premium_feature'`.

### Phase 5: Barber Appointment Manager

**New file: `src/components/booking/BarberAppointmentManager.tsx`**
- New tab in CreatorHub / barber dashboard
- **Services tab**: CRUD for services with BB prices, toggle house_call/sos eligibility
- **Schedule tab**: Set weekly availability per day
- **Appointments tab**: List of pending/confirmed/completed appointments
  - Accept/Deny buttons on pending appointments (deny requires reason)
  - Mark complete button on confirmed appointments
  - SOS appointments highlighted with pulsing orange indicator

### Phase 6: Wire Up

- Replace placeholder toast in `BarberPublicProfile.tsx` line 370 with `BookingConsole` dialog
- Add appointment manager tab to CreatorHub

### Files Summary

| Action | File |
|--------|------|
| Migration | 4 tables + enums + RLS + indexes |
| New edge fn | `supabase/functions/book-appointment/index.ts` |
| New edge fn | `supabase/functions/manage-appointment/index.ts` |
| New component | `src/components/booking/BookingConsole.tsx` |
| New component | `src/components/booking/DateSlotPicker.tsx` |
| New component | `src/components/booking/ServiceSelector.tsx` |
| New component | `src/components/booking/BountyPresetPicker.tsx` |
| New component | `src/components/booking/EscrowConfirmDialog.tsx` |
| New component | `src/components/booking/BarberAppointmentManager.tsx` |
| New hook | `src/hooks/useBarberAvailability.tsx` |
| New hook | `src/hooks/useBookAppointment.tsx` |
| Edit | `src/pages/BarberPublicProfile.tsx` -- replace toast with dialog |
| Edit | `src/components/creator/CreatorHub.tsx` -- add appointments tab |

