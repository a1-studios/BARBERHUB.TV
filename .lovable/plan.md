

## Full Appointment Engine -- Anti-Gravity Audit & Build Plan

### Current State

**What exists:**
- `appointments` table with full schema (status enum, escrow, SOS multiplier, location fields)
- `barber_services` table (name, price_bb, duration, allows_house_call, allows_sos, is_active)
- `barber_availability` table (day_of_week, start/end time, slot_duration)
- `barber_blocked_slots` table (blocked_start/end, reason)
- `barber_bucks_transactions` ledger
- `appointment_reviews` + `review_tags` + `reputation_scores` (Pioneer system -- done)
- Edge functions: `book-appointment`, `manage-appointment`
- Frontend: `BookingConsole`, `ServiceSelector`, `DateSlotPicker`, `BountyPresetPicker`, `EscrowConfirmDialog`, `BarberAppointmentManager`, `MyAppointments`
- Hook: `useBarberAvailability` (slots, blocked, existing appointments)

**What's missing for the full Anti-Gravity engine:**

| Gap | Detail |
|-----|--------|
| No `deposit_bb` or `is_free_intro` on `barber_services` | Can't do "free first cut" or deposit-only holds |
| No `house_call_bounties` table | Client-initiated bounty board doesn't exist |
| No `post-bounty` edge function | Can't post bounties with BB escrow |
| No `claim-bounty` edge function | Can't atomically claim bounties |
| No expiration trigger for bounties | No auto-refund on unclaimed bounties |
| Tier-gating still in code | `BookingConsole` + `BarberAppointmentManager` + both edge functions still block Bronze barbers |
| `book-appointment` doesn't handle deposits | Always escrows full price |
| No `HouseCallBountyWidget` | Clients can't post open bounties |
| No `BountyBoard` | Barbers can't see/claim bounties |
| No "My Bounties" in `MyAppointments` | Clients can't track posted bounties |
| `appointments` table missing `is_deposit_only` and `remainder_bb` | Can't track partial escrow |

---

### Implementation Plan

#### 1. Database Migration

**Alter `barber_services`:**
- Add `deposit_bb INTEGER DEFAULT 0`
- Add `is_free_intro BOOLEAN DEFAULT false`

**Alter `appointments`:**
- Add `is_deposit_only BOOLEAN DEFAULT false`
- Add `remainder_bb INTEGER DEFAULT 0`

**Create `house_call_bounties`:**
```
id, client_id, location_text, location_lat, location_lng,
service_description, bounty_amount_bb, preferred_date,
status (open/claimed/completed/expired/cancelled),
claimed_by_barber_id, claimed_by_user_id, claimed_at,
appointment_id (FK to appointments, set on claim),
expires_at (default NOW + 24hrs), notes, created_at
```

**RLS:** Authenticated SELECT all open bounties. Clients INSERT/UPDATE own. Barbers UPDATE to claim.

**Anti-Gravity Triggers:**

1. `trg_bounty_status_change` -- AFTER UPDATE on `house_call_bounties`:
   - On `expired`: refund client BB, notify client
   - On `claimed`: notify client that a barber accepted

2. `expire_bounties_batch()` -- callable function that sets `status = 'expired'` for all open bounties past `expires_at` (called by pg_cron every 5 minutes)

#### 2. Edge Functions

**`post-bounty`** (new):
- Validate client has sufficient BB
- Enforce min 500 BB
- Deduct BB from client (escrow)
- Insert into `house_call_bounties`
- Notify nearby barbers via `create_battle_notification`

**`claim-bounty`** (new):
- Validate bounty is still `open`
- Atomic claim with row-level lock (`FOR UPDATE`)
- Create appointment from bounty data
- Link `appointment_id` back to bounty
- Notify client

**`book-appointment`** (modify):
- Support `deposit_bb` from service: if service has `deposit_bb > 0`, only escrow that amount, set `is_deposit_only = true`, `remainder_bb = price - deposit`
- Allow `escrow_amount_bb = 0` for `is_free_intro` services
- Remove tier-gate block entirely

**`manage-appointment`** (modify):
- Remove tier-gate block in accept action
- On complete for deposit-only appointments: collect remainder from client wallet before paying barber

#### 3. Frontend Changes

| File | Change |
|------|--------|
| `BookingConsole.tsx` | Remove `canAcceptPremium`/`isPremiumLocked` logic. Show deposit vs. full price breakdown. Support 0 BB "FREE" bookings. |
| `ServiceSelector.tsx` | Show "FREE" badge for `is_free_intro`. Show "X BB deposit" if `deposit_bb > 0`. |
| `BarberAppointmentManager.tsx` | Remove tier check on accept. Add deposit/free-intro fields to Add Service dialog. Add "Bounty Board" tab. |
| `MyAppointments.tsx` | Add "My Bounties" tab showing posted bounties + status. Add cancel bounty button. |
| `EscrowConfirmDialog.tsx` | Show deposit vs. remainder breakdown when `is_deposit_only`. |
| `HouseCallBountyWidget.tsx` | **Create** -- location input, bounty slider, service description, preferred date. Calls `post-bounty`. |
| `BountyBoard.tsx` | **Create** -- barber-facing feed of open bounties. Cards show location, amount, description, expiry countdown. "Claim" button calls `claim-bounty`. |
| `BountyPresetPicker.tsx` | Add 500 BB preset. |

#### 4. Anti-Gravity Summary

| Capability | Mechanism |
|------------|-----------|
| Free first cut | `is_free_intro` flag on service, `book-appointment` allows 0 BB |
| Deposit-only escrow | `deposit_bb` on service, edge function escrows deposit only |
| Remainder collection on complete | `manage-appointment` collects `remainder_bb` from client on completion |
| Bounty posting + BB lock | `post-bounty` edge function deducts BB upfront |
| Bounty claiming (atomic) | `claim-bounty` edge function with `FOR UPDATE` row lock |
| Bounty expiration + refund | DB trigger on status change + `pg_cron` batch every 5 min |
| Notifications | DB triggers on bounty status changes |
| No tier-gating | All tier checks removed from edge functions and frontend |

