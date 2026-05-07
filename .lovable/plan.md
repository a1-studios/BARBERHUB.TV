# Intake Flow v2 — Dopamine Capture, Hidden Prizes, Sunday Reveal

## Core Principle

**Never reveal what they won.** Every user gets a raffle ticket. The thrill is the unknown — winners are announced manually from Sovereign HQ on Sundays.

---

## New Wizard Structure (still ~3 visible steps)

```text
Step 1: HOOK            → 1-click socials (icons up top) OR email
Step 2: PICK YOUR SIDE  → Barber / Fan
   ├─ if Barber → inline status sub-picker (5 options incl. Aspiring)
Step 3: TICKET REVEAL   → Animated wheel → "🎟️ TICKET #XXXX-YYY"
                          (no prize, no BB amount shown)
Step 4: CLAIM           → conditional, see below
```

---

## Step 1 — The Hook (`StepIdentityHook.tsx`)

**Re-arranged so 1-click is FIRST, not buried at the end:**

Layout top-to-bottom:

1. Headline: **"Your Sunday could change."** Sub: *"Tune in Sunday. Winners pulled live."*
2. **Row of 3 small circular icon buttons at the top** — Google, Apple, Meta. Tap = OAuth → skip directly to Step 2 with email pre-filled from provider.
3. Tiny "or use email" divider.
4. Email input + Continue (existing `register-lead` invoke).
5. Remove the "15–50 BB + raffle ticket" pill copy entirely. Replace with mysterious one-liner: *"be of the One lucky 🍀 winners. tune in this sunday to find out."*

---

## Step 2 — Pick Your Side (`StepRole.tsx`)

Two big role cards. **If Barber tapped, expand inline sub-status picker** (no extra step)


| ID               | Label          | Desc                                            |
| ---------------- | -------------- | ----------------------------------------------- |
| `licensed`       | Licensed Pro   | Active license                                  |
| `unlicensed`     | Unlicensed Pro | Cuts professionally                             |
| `student`        | Student        | In barber school                                |
| `beginner`       | Beginner       | Just getting started                            |
| `**aspiring**` ⭐ | **Aspiring**   | **Thinking about it** *(highlighted with glow)* |


Tapping any sub-status (or "Fan") auto-advances to Step 3.

**Also captured here (lightweight, optional-looking):**

- Country flag picker (compact) — *captures nationality but not strictly required to advance*
- Phone number input — *optional, no validation gate*

These are inline on the same card, small inputs. The country selector list must include **Puerto Rico (PR / 🇵🇷)** — currently missing.

---

## Step 3 — Ticket Reveal (`StepRaffleSpin.tsx` rewrite)

Same orange wheel animation, but **no prize segments shown**. After the spin lands:

```
   🎟️
  TICKET
 #A7K-2291
 ────────
 Tune in Sunday
 to see if you won
```

Server still selects + persists a hidden prize tier (segmented by role/status) on the lead row, but the UI never reveals it. Sovereign HQ uses these segments when picking Sunday winners.

---

## Step 4 — Claim Account (conditional)

**If user came in via OAuth (Step 1 socials):** they're already authenticated → ticket auto-linked → show the **"Complete your profile to lock in your prize" prompt immediately** (per user's note: 1-click users skipped detail capture, so we ask now).

**If user came in via email-only:** show the existing magic-link CTA (no profile prompt — they'll complete it post-magic-link). Country/phone were already captured at Step 2.

---

## Profile Completion Prompt (new, post-claim)

Shown only to OAuth-completed users. Single lightweight card with:

- Country (required, flag picker — incl. Puerto Rico)
- Phone (optional)
- For barbers: Zip + 1–3 specialty pills
- "Skip for now" link (non-blocking)

Lives in a new component `StepProfileBoost.tsx`. Repurposes pieces from current `StepBarberDetails` / `StepFanDetails`.

---

## Backend Changes

1. **Migration**
  - Add `'aspiring'` to `barber_status` enum (or text constraint).
  - Ensure `marketing_leads` has columns: `phone_number text` (nullable), `prize_segment text`, `prize_tier text`, `prize_revealed_at timestamptz`.
  - Index on `prize_segment` for Sunday draw filtering.
2. `**claim-raffle-ticket` edge function**
  - Accept `role`, `barber_status` (optional).
  - Server picks a hidden `prize_tier` (small / medium / grand) weighted by segment.
  - Returns ONLY `{ ticket_code }` to the client. No prize, no BB amount.
3. `**submit-role-details` edge function**
  - Make `country_code`, `zip_code`, `specialties` optional.
  - Accept optional `phone_number`.
  - Required: `role`, and (if barber) `barber_status`.
4. `**register-lead**` — accept optional `country_code` and `phone_number` so OAuth callback can pass through provider data.
5. **Country list fix**
  - Find the country source (likely `src/components/CountrySelector.tsx` or a config file) and add Puerto Rico: `{ code: 'PR', name: 'Puerto Rico', flag: '🇵🇷', dial: '+1' }`.
6. **Sovereign HQ — new panel `RaffleTicketsPanel**`
  - Table of all tickets: email, role, segment, hidden prize_tier, issued_at.
  - Filter by segment (fan / aspiring / student / unlicensed / licensed).
  - "Pick Sunday Winner" action → manually mark a ticket as winner per tier, triggers notification.

---

## Files Touched

**Rewrite**

- `src/components/coming-soon/StepIdentityHook.tsx` — socials at top, mysterious copy
- `src/components/coming-soon/StepRole.tsx` — inline sub-status (5 incl. Aspiring) + country + optional phone
- `src/components/coming-soon/StepRaffleSpin.tsx` — ticket-only reveal, no prize
- `src/components/coming-soon/LaunchWizard.tsx` — collapse to 3 main steps + conditional profile prompt
- `src/components/coming-soon/SegmentedProgress.tsx` — 3 dots

**New**

- `src/components/coming-soon/StepProfileBoost.tsx` — post-claim profile prompt for OAuth users
- `src/components/sovereign/RaffleTicketsPanel.tsx`

**Light edits**

- `src/components/coming-soon/StepClaimAccount.tsx` — branch: OAuth vs email
- `src/components/CountrySelector.tsx` (or country config file) — add Puerto Rico
- `supabase/functions/claim-raffle-ticket/index.ts`
- `supabase/functions/submit-role-details/index.ts`
- `supabase/functions/register-lead/index.ts`

**Remove from required path** (still keep files for now)

- `StepBarberDetails.tsx`, `StepFanDetails.tsx` → no longer in main wizard

---

## Summary of User-Locked Decisions

- ✅ Hide all prizes; only show ticket code; reveal Sunday via Sovereign HQ
- ✅ "Aspiring" added as 5th barber status
- ✅ Profile-completion prompt fires **immediately** but **only** for 1-click OAuth users
- ✅ Capture nationality (country) and optional phone in the main flow
- ✅ Add Puerto Rico to the country/flag list