## Full Appointment Engine — Anti-Gravity (COMPLETED)

### What Was Built

#### Database
- `barber_services`: Added `deposit_bb` (INTEGER) and `is_free_intro` (BOOLEAN)
- `appointments`: Added `is_deposit_only` (BOOLEAN) and `remainder_bb` (INTEGER)
- `house_call_bounties`: New table with RLS, status tracking, expiry
- `handle_bounty_status_change` trigger: Auto-refunds expired bounties, notifies on claim
- `expire_bounties_batch()`: Callable function for pg_cron to expire stale bounties

#### Edge Functions
- `post-bounty`: Client posts house call bounty, BB escrowed
- `claim-bounty`: Barber atomically claims bounty, auto-creates appointment
- `book-appointment`: Rewritten — deposit support, free intro, no tier-gating
- `manage-appointment`: Rewritten — remainder collection on complete, no tier-gating

#### Frontend
- `BookingConsole.tsx`: Deposit/free-intro aware, tier-gating removed
- `ServiceSelector.tsx`: FREE badge, deposit display
- `EscrowConfirmDialog.tsx`: Deposit vs remainder breakdown, free booking support
- `HouseCallBountyWidget.tsx`: New — client posts house call bounties
- `BountyBoard.tsx`: New — barber-facing feed of open bounties
- `MyAppointments.tsx`: Added "Bounties" tab with post widget + active/past bounties
- `BarberAppointmentManager.tsx`: Added "Bounties" tab with BountyBoard, deposit/free fields in Add Service, tier-gating removed
- `BountyPresetPicker.tsx`: Added 500 BB preset

### Pending
- Set up pg_cron job to call `expire_bounties_batch()` every 5 minutes
