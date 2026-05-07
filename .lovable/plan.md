# Intake Flow v3 — Fix OAuth Role Lock, Color-Tier Reveal, New Wheel

## Problems to Fix

1. **OAuth auto-assigns Fan role** — users go through Google/Apple/Meta and never get to pick Barber/Fan, never get to spin, never pick country.
2. **Wheel reveal is flat** — no visual hint of prize quality. Want a 3-tier color reveal (white = low, blue = medium, orange = high) without disclosing actual prize.
3. **Email path still shows "Continue with Google/Apple/Meta" buttons at the end** — needs a clean, intelligent finish (no duplicate socials at claim step).
4. **Wheel visuals** — replace with the supplied `scroll-morph-hero` component, restyled with our orange/black/blue branding (no Unsplash, no "AI" copy).

---

## New OAuth Flow (deferred role + auto-credit)

OAuth one-tap should NOT lock a role at signup. Instead:

```text
1-click OAuth tap
   → register-lead (email only, role=null)
   → claim-raffle-ticket (role=null, hidden tier still computed)
   → Step 3: spin + ticket reveal (color-coded)
   → auth.signInWithOAuth() launches provider
   → AuthCallback: ticket already linked by email
   → On first app load: ProfileCompletionGate modal
        - Pick role (Barber / Fan)
        - If barber: pick status (5 options incl. Aspiring)
        - Pick country (flag, incl. Puerto Rico)
        - Optional phone
        - "Lock in my prize" CTA
   → Background job (DB trigger or edge function on profile update)
        credits ticket + BB to the now-completed account
```

### Files

- `**StepIdentityHook.tsx**` — keep 1-tap socials at top, but socials now go straight to spin (skip Step 2 Role entirely).
- `**LaunchWizard.tsx**` — add `flow: 'oauth' | 'email'` branch. OAuth flow = Hook → Spin → OAuth redirect. Email flow = Hook → Role → Spin → Claim.
- `**StepClaimAccount.tsx**` — for email flow only: show ONLY the magic-link button. Remove the Google/Apple/Meta buttons at the bottom (user explicitly called this out).
- **NEW `src/components/auth/ProfileCompletionGate.tsx**` — modal shown on first authed app load if `profiles.user_type IS NULL` or `country_code IS NULL`. Forces role + country pick. Optional phone, optional barber status.
- **NEW edge function `finalize-oauth-claim**` — invoked from ProfileCompletionGate. Atomically:
  1. Sets `profiles.user_type`, `country_code`, `phone_number`, `barber_status`.
  2. Links any pending `marketing_leads` row by email to this `user_id`.
  3. Credits the BB amount tied to the hidden `prize_tier`.
  4. Marks the lead as `claimed_at = now()`.

### DB

- Add `marketing_leads.linked_user_id uuid` (nullable) + `claimed_at timestamptz`.
- Add `marketing_leads.prize_tier_color text` denormalized for fast wheel reveal (`white | blue | orange`).
- Optional: nightly cron (pg_cron) to backfill any stranded leads where `auth.users.email` matches.

---

## Color-Tier Wheel Reveal

After the new wheel finishes its spin, instead of showing prize copy, the ticket card pulses one of three colors based on the hidden `prize_tier`:


| Tier   | Color                            | Glow           | Probability |
| ------ | -------------------------------- | -------------- | ----------- |
| Low    | White (`hsl(0 0% 100%)`)         | soft cool glow | ~70%        |
| Medium | Zion Blue (`hsl(195 100% 50%)`)  | electric pulse | ~25%        |
| High   | Neon Orange (`hsl(20 100% 56%)`) | intense bloom  | ~5%         |


UI never says "low/medium/high" — color is the only signal. Copy stays mysterious: *"Your color is locked. Tune in Sunday."*

### Files

- `**StepRaffleSpin.tsx**` — read `tier_color` from `claim-raffle-ticket` response, animate ticket card border + bg gradient to that color after spin lands.
- `**claim-raffle-ticket/index.ts**` — return `{ ticket_code, tier_color }` (still no prize amount, no BB number).
- Weighting table moved server-side; segments by role/status preserved per existing v2 plan.

---

## New Wheel (scroll-morph-hero, rebranded)

Drop the user-supplied `scroll-morph-hero.tsx` into `src/components/ui/` and rebrand:

- **No Unsplash** — replace `IMAGES` with 20 procedurally-generated card faces using our brand: alternating Deep Black / Zion Blue / Neon Orange tiles with the BarberHub mark (use `RotatingBBCoin` SVG or a simple BB monogram).
- **No "AI / future" copy** — replace intro text with *"Spin the wheel. Lock your color."* and arc-active text with *"Your ticket is forming…"*.
- **Trigger spin programmatically** — Step 3 doesn't rely on user scroll. On mount, drive `virtualScroll` from 0 → 3000 over ~2.8s with an ease-out curve, then snap-stop. After stop, fire the color reveal.
- **Mount inside Step 3** — replaces the current orange wheel inside `StepRaffleSpin.tsx`. Container locked at ~520px tall on mobile.
- **Brand tokens** — pull from `index.css` HSL tokens, no hex.

### Files

- **NEW `src/components/ui/scroll-morph-hero.tsx**` — pasted + adapted (TS clean, branded, no Unsplash, no AI text, programmatic auto-spin).
- `**StepRaffleSpin.tsx**` — swap orange wheel for `<ScrollMorphHero autoSpin onSettle={revealColor} tierColor={tier} />`.
- `**tailwind.config.ts**` — confirm `framer-motion` keyframes / no extra plugin needed (already installed).

---

## Cleanup

- Remove the trailing social buttons in `StepClaimAccount.tsx` (only show magic-link CTA + ticket recap).
- Remove `StepRole` from the OAuth branch of `LaunchWizard.tsx` (still used for email branch).
- Add a tiny "Step 1 of 2" pill for OAuth flow (since they skip role pick).

---

## Files Touched

**New**

- `src/components/auth/ProfileCompletionGate.tsx`
- `src/components/ui/scroll-morph-hero.tsx`
- `supabase/functions/finalize-oauth-claim/index.ts`

**Edited**

- `src/components/coming-soon/LaunchWizard.tsx` (oauth vs email branching)
- `src/components/coming-soon/StepIdentityHook.tsx` (OAuth → skip to spin)
- `src/components/coming-soon/StepRaffleSpin.tsx` (new wheel + color reveal)
- `src/components/coming-soon/StepClaimAccount.tsx` (remove duplicate socials)
- `src/App.tsx` (mount ProfileCompletionGate inside authed shell)
- `supabase/functions/claim-raffle-ticket/index.ts` (return tier_color, allow null role)
- `supabase/functions/register-lead/index.ts` (allow null role)

**Migration**

- Add `linked_user_id`, `claimed_at`, `prize_tier_color` to `marketing_leads`.
- Allow `marketing_leads.role` NULL.

---

## Open Questions

1. **Tier color probabilities** — keep my proposed 70/25/5, or do you want different odds (e.g. 60/30/10)? yes just keep the collors with a 3 different barbers symbles like a comb or razor 
2. **ProfileCompletionGate dismissibility** — block the whole app until completed, or allow "skip for now" with a persistent top banner? allow users to watch the videos and scroll but once they want to interact or do anything they most complete the profile for us to know we we serving if the barber or the fan .
3. **Card faces in the new wheel** — generate 20 abstract brand tiles (BB monogram + scissors + flame + crown rotating colors), or pull from existing project assets (champion banners, faction crests)? Priority for mobile use and watching and just esu a few cars showing our assets like videos profiles showing the bationality and make this card have a cyan blue wuth a trasparent holografic style 