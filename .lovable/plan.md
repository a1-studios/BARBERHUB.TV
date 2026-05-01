# Lead-First Raffle Funnel

Convert the current 4-step launch wizard into a strict **Lead → Role Detail → Spin → Ticket → Account** flow. The spin button is locked until contact info AND role-specific details are saved. Each identity gets exactly one raffle ticket (e.g. `BH-9921`) for the manual Sunday draw. Account creation is moved to the end and is **optional / social-auth only**.

## New flow (5 steps)

```text
Step 1  IDENTITY HOOK          email or phone (one of two) → upsert lead
Step 2  ROLE PICK              barber | fan
Step 3a FAN DETAILS            nationality (dropdown only)
Step 3b BARBER DETAILS         zip, nationality, status, specialties (1-3)
Step 4  SPIN                   wheel enabled → 15-50 BB random + raffle code BH-XXXX
Step 5  CLAIM ACCOUNT          Google / Apple / Meta one-click (Email fallback)
```

The Spin button stays visually locked (pad-lock + greyed CTA) until steps 1 and 3 are validated server-side.

## Database changes

New table `raffle_entries` (one row per identity):

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| ticket_code | text unique | format `BH-XXXX`, generated server-side |
| email | text | nullable, unique when present |
| phone | text | nullable, unique when present |
| role | text | `barber` \| `fan` |
| country_code | text | required |
| zip_code | text | barbers only |
| barber_status | text | `licensed` \| `student` \| `unlicensed` \| `beginner` |
| specialties | text[] | barbers only, max 3 |
| bb_awarded | int | 15–50 |
| draw_week | date | next Sunday, for sovereign export |
| device_fingerprint | text | anti-fishing |
| ip_address | text | anti-fishing |
| claimed_user_id | uuid | filled when user finishes social signup |
| created_at | timestamptz | |

- Unique partial indexes on `email` and `phone` so a contact can only spin once.
- RLS: insert/select restricted to service role; admin (sovereign) read via `has_role(auth.uid(),'admin')`.
- Existing `marketing_leads` is kept for analytics; we add a `raffle_ticket_code` column to link the two.

## Edge functions

1. **`register-lead`** (new) — validates email/phone, inserts/updates `marketing_leads`, returns a `lead_token` (signed JWT, 30 min) for subsequent calls. Anti-duplicate by email+fingerprint+IP.
2. **`submit-role-details`** (new) — accepts `lead_token` + role payload (fan: country; barber: country, zip, status, specialties). Validates with Zod, marks lead as "spin-eligible".
3. **`claim-raffle-ticket`** (new) — requires a spin-eligible `lead_token`; rolls 15–50 BB server-side; generates collision-free `BH-XXXX` (4 alphanumeric, retry on conflict); inserts into `raffle_entries`; returns `{ ticket_code, bb_awarded }`. Hard rule: one ticket per email/phone/fingerprint.
4. **`link-raffle-to-user`** (new) — called after social signup; matches by email and stamps `claimed_user_id`, credits the BB into the user's wallet via `barber_bucks_transactions`.

## Frontend changes

- Replace `LaunchWizard` step set:
  - `StepIdentityHook` (new) — email **or** phone toggle; calls `register-lead`.
  - `StepRole` (existing, kept).
  - `StepFanDetails` (new) — only `CountrySelector`.
  - `StepBarberDetails` (new) — country + zip + radio status + specialty pills (reuse `SPECIALTY_TAGS`, max 3).
  - `StepSpin` (modified) — wheel now calls `claim-raffle-ticket`; shows the BH-XXXX ticket reveal animation; removes existing client-side prize generation.
  - `StepClaim` (new, replaces `StepLiveFinalize`) — three big buttons: Google, Apple, Meta; small "use email" fallback. On success → calls `link-raffle-to-user`.
- `SegmentedProgress` updated to 5 steps.
- The **Spin** CTA inside `StepSpin` reads server response; the wheel UI itself becomes a visual representation of the server roll (no client RNG for the prize).
- Specialty selector reuses `src/config/specialtyTags.ts` (`SPECIALTY_TAGS`, `MAX_SPECIALTIES = 3`).

## Sovereign HQ export

Add a "Raffle Tickets" panel under `/sovereign-hq` that lists `raffle_entries` with filters by `draw_week` and a CSV export button (uses existing `has_role(auth.uid(),'admin')` guard). This satisfies the manual-Sunday-draw requirement.

## Anti-fishing guarantees

- Spin endpoint refuses if `(email | phone | fingerprint | IP)` already has a ticket.
- Wheel button is `disabled` until `lead_token` is present **and** role details have been submitted.
- All BB awards are written server-side in `claim-raffle-ticket` (consistent with the existing economy-integrity rule).

## Out of scope

- Reworking the existing prize wheel cosmetics (kept).
- Email-confirmation copy (separate prior task already covers branded templates).
- Tournament / battle systems.

## Open question (will ask before coding)

Should the social-auth step be **required** to actually receive the BB into a wallet (ticket alone is kept anonymously until then), or should the BB be locked to the email and credited automatically when the user later signs up by any method?
