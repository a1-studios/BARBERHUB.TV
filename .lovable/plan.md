

## M4M Heartbeat System — Implementation Plan

This adds the "Minutes for Men" peer support badge to barber profiles with a 3-tier visual state, heartbeat animation, and client verification flow.

### 1. Database Migration

Add M4M columns to `barber_profiles` and create a session verification table:

```sql
-- Add M4M fields to barber_profiles
ALTER TABLE barber_profiles
  ADD COLUMN m4m_certified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN m4m_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN m4m_lives_touched INTEGER NOT NULL DEFAULT 0;

-- Session verification log
CREATE TABLE m4m_session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_code TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX idx_m4m_code ON m4m_session_logs(verification_code);
ALTER TABLE m4m_session_logs ENABLE ROW LEVEL SECURITY;

-- Barbers can insert (generate codes) and read own logs
CREATE POLICY "Barbers manage own m4m logs"
  ON m4m_session_logs FOR ALL TO authenticated
  USING (barber_user_id = auth.uid())
  WITH CHECK (barber_user_id = auth.uid());

-- Clients can read by code and update to verify
CREATE POLICY "Clients can verify sessions"
  ON m4m_session_logs FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (client_user_id = auth.uid() AND verified = true);

-- Anyone authenticated can read verified count (for display)
CREATE POLICY "Anyone can read verified sessions"
  ON m4m_session_logs FOR SELECT TO authenticated
  USING (verified = true);
```

### 2. New Component: `src/components/m4m/M4MHeartbeat.tsx`

- **Props**: `{ certified: boolean, paid: boolean, livesTouched: number, barberName: string, barberUserId: string, size?: 'sm' | 'md' }`
- **SVG Icon**: Custom inline SVG of interlocking hands forming a heart outline
- **Three states**:
  - `!certified`: Hidden (`opacity-0` or not rendered)
  - `certified && !paid`: Static white/grey outline at 50% opacity
  - `certified && paid`: Framer Motion scale animation (1.0 → 1.08 → 1.0, 2s loop) with Zion Blue (`#002D62`) neon glow via `filter: drop-shadow`
- **On click**: Opens `M4MVerificationModal`

### 3. New Component: `src/components/m4m/M4MVerificationModal.tsx`

- Dialog with title "Minutes for Men Impact"
- Shows: "This Barber has touched **{count}** lives through M4M peer support."
- 4-digit code input using OTP input component (reuse `InputOTP`)
- "Verify Connection" button
- On verify: query `m4m_session_logs` by code, update `verified = true` and `client_user_id`, then increment `barber_profiles.m4m_lives_touched`

### 4. Edit: `src/components/barber/BarberProfileCard.tsx`

- Fetch `m4m_certified`, `m4m_paid`, `m4m_lives_touched` from `barber_profiles` (add to `extraProfileData` query)
- Place `<M4MHeartbeat>` centered below the Avatar (after line 188, before `<div className="flex-1">`)

### 5. Edit: `src/pages/BarberPublicProfile.tsx`

- Fetch M4M fields from `barber_profiles` (add to subscription query)
- Place `<M4MHeartbeat>` centered below the Avatar (after line 290)

### 6. Edit: `src/components/barber/BarberProfileHeader.tsx`

- Add M4M props to interface: `m4m_certified`, `m4m_paid`, `m4m_lives_touched`, `barber_user_id`
- Place `<M4MHeartbeat>` centered below the Avatar (after line 109)

### Files Created
1. `src/components/m4m/M4MHeartbeat.tsx`
2. `src/components/m4m/M4MVerificationModal.tsx`
3. Database migration

### Files Edited
1. `src/components/barber/BarberProfileCard.tsx` — add M4M data fetch + heart placement
2. `src/pages/BarberPublicProfile.tsx` — add M4M data fetch + heart placement
3. `src/components/barber/BarberProfileHeader.tsx` — add M4M props + heart placement

