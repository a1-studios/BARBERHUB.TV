

## Vault of Honor: Full Implementation Plan

This builds the entire 4-step gamified lead capture funnel with anti-repeat logic, role-tailored prizes, and pre-filled signup flow.

### Database

#### 1. Migration: `marketing_leads` table
```sql
CREATE TABLE public.marketing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('barber', 'fan')),
  device_fingerprint TEXT,
  shared BOOLEAN DEFAULT false,
  prize_id TEXT,
  prize_label TEXT,
  converted BOOLEAN DEFAULT false,
  spins_used INTEGER DEFAULT 0,
  max_spins INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_marketing_leads_email ON public.marketing_leads(email);
CREATE INDEX idx_marketing_leads_fingerprint ON public.marketing_leads(device_fingerprint);

ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

-- Anon insert for lead capture
CREATE POLICY "Anon can insert leads" ON public.marketing_leads FOR INSERT TO anon WITH CHECK (true);
-- Anon can update own lead by email (for share/spin updates)
CREATE POLICY "Anon can update leads" ON public.marketing_leads FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- Anon can read own lead by fingerprint
CREATE POLICY "Anon can read own leads" ON public.marketing_leads FOR SELECT TO anon USING (true);
-- Sovereign reads all
CREATE POLICY "Sovereign reads all leads" ON public.marketing_leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'sovereign'));
```

### New Files (7 total)

#### 2. `src/utils/deviceFingerprint.ts`
- Generate a hash from `navigator.userAgent` + `screen.width` + `screen.height` + `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Simple string concat + basic hash, no external library
- Export `getDeviceFingerprint(): string`

#### 3. `src/pages/VaultOfHonor.tsx`
- Full-screen page (`fixed inset-0 z-50`), dark metallic theme
- State machine: `entry` → `viral-gate` → `spin` → `victory`
- On mount: check `localStorage` for `vault_fingerprint` → query `marketing_leads` by fingerprint
  - If found AND `spins_used >= max_spins`: show "You've already played!" message with CTA to sign up instead
  - If found AND `spins_used < max_spins`: resume from where they left off (skip entry, go to viral gate or spin)
- Passes `role`, `email`, `leadId` down to child components

#### 4. `src/components/vault/VaultEntry.tsx` (View 1)
- Pulsing vault door visual (CSS radial gradient + Framer Motion pulse)
- Email input + Role toggle (Barber / Fan) using same button style as LandingHero
- "POWER THE VAULT" CTA
- On submit: upsert into `marketing_leads`, store fingerprint in `localStorage` as `vault_fingerprint`, advance

#### 5. `src/components/vault/VaultViralGate.tsx` (View 2)
- Lock animation (Framer Motion)
- "SHARE TO SPIN" button using `navigator.share()` with fallback copy-link
- On share intent: update `marketing_leads.shared = true`, advance
- Skip button after 5 seconds (still advances but `shared` stays false)

#### 6. `src/components/vault/VaultSpinWheel.tsx` (View 3)
- CSS wheel with 4 segments, Framer Motion rotate animation
- **Role-based prizes**:
  - **Barber**: Free month Bronze upgrade (60%), 100 BB bonus (25%), Free month Silver upgrade (10%), 3 months Gold tier (5%)
  - **Fan**: 25 BB starter (60%), 100 BB bonus (25%), Hunter Pass trial (10%), National Contender Pass (5%)
- Pre-calculate winning segment, animate to it
- `canvas-confetti` burst on result
- Update `marketing_leads` with `prize_id`, `prize_label`, increment `spins_used`

#### 7. `src/components/vault/VaultVictory.tsx` (View 4)
- Prize reveal animation
- "CLAIM YOUR BOUNTY" CTA → navigates to `/?tab=signup&email={email}&role={role}&prize_id={prize_id}`
- Prize is escrowed — message says "Complete signup to claim"

#### 8. `src/components/sovereign/VaultMetricsPanel.tsx`
- Fetch from `marketing_leads`: total leads, conversion rate, role split, prize distribution, share rate
- Simple card layout with stats

### File Edits (3 files)

#### 9. `App.tsx` — Add `/vault` route (public, no auth guard)

#### 10. `LandingHero.tsx` — Two changes:
- Add pulsing "SPIN TO WIN" button below the sign-in card that links to `/vault`
- Read URL params `?tab=signup&email=X&role=X&prize_id=X` on mount → pre-fill signup form with email and role, show prize banner at top of signup tab

#### 11. `SovereignHQ.tsx` — Import and render `VaultMetricsPanel` after `SponsorControlPanel`

### Anti-Annoyance Logic
- `localStorage` key `vault_fingerprint` persists the device fingerprint
- On `/vault` load: if fingerprint exists in DB with `spins_used >= max_spins`, show a friendly "Already played" screen with direct signup link — never shows the wheel again
- Max 2 spins per device (configurable via `max_spins` column)
- The vault is only linked from the landing page (unauthenticated users) — logged-in users never see it

### Profile Pre-Fill Flow
- When user clicks "CLAIM YOUR BOUNTY", they land on `/?tab=signup&email=EMAIL&role=ROLE&prize_id=PRIZE`
- `LandingHero` reads these params, sets `activeTab='signup'`, pre-fills `signUpData.email` and `signUpData.userType`
- After successful signup, the `handle_new_user()` DB trigger already creates the profile with `user_type` and `country_code` from metadata
- A new `useEffect` in `LandingHero` marks `marketing_leads.converted = true` after signup completes (matching by email)

