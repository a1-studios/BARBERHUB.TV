
-- ==========================================
-- FIX 1: marketing_leads RLS - restrict SELECT and UPDATE to device_fingerprint
-- ==========================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anon can read own leads" ON marketing_leads;
DROP POLICY IF EXISTS "Anon can update own leads" ON marketing_leads;

-- Recreate SELECT policy scoped to device_fingerprint
CREATE POLICY "Anon can read own leads by fingerprint" ON marketing_leads
  FOR SELECT TO anon
  USING (false);

-- Recreate UPDATE policy scoped to device_fingerprint  
CREATE POLICY "Anon can update own leads by fingerprint" ON marketing_leads
  FOR UPDATE TO anon
  USING (false)
  WITH CHECK (false);

-- Since the app uses the anon key with device_fingerprint filtering in the client,
-- we need authenticated-level policies too. But since these are anonymous users
-- using the anon key, we block all anon access and let the app filter client-side.
-- The app already filters by device_fingerprint in its queries.
-- Actually, the app uses supabase client (anon key) so we need anon SELECT with fingerprint filter.
-- But RLS can't access request headers for fingerprint. Let's use a more practical approach:
-- Allow SELECT only, block UPDATE for anon, and handle updates via RPC or edge function.

-- Actually let me reconsider. The app does:
-- 1. SELECT ... .eq('device_fingerprint', fp) - needs anon SELECT
-- 2. UPDATE ... .eq('id', leadId) - needs anon UPDATE  
-- 3. UPSERT with device_fingerprint - needs anon INSERT

-- The fix should scope policies to require device_fingerprint match.
-- But we can't enforce "must filter by fingerprint" in RLS directly.
-- Best approach: remove email from SELECT results for anon, or accept that 
-- this is a marketing leads table with minimal sensitivity.

-- Practical fix: Drop the broad policies and create fingerprint-scoped ones
DROP POLICY IF EXISTS "Anon can read own leads by fingerprint" ON marketing_leads;
DROP POLICY IF EXISTS "Anon can update own leads by fingerprint" ON marketing_leads;

-- For INSERT: keep existing insert policy (anon can insert their own lead)
-- For SELECT: anon can only read rows matching a device_fingerprint they know
-- We can't enforce "they must provide fingerprint" in RLS, but we CAN
-- make it so they can only see rows they inserted by using a session identifier.
-- Since there's no auth, device_fingerprint IS the session identifier.

-- The real issue is USING(true). We can't scope to "their" fingerprint without
-- a session. The practical fix is to just block anon from reading ALL rows
-- and instead create a security definer function that returns only matching rows.

-- Create a security definer function for safe lead lookup
CREATE OR REPLACE FUNCTION public.get_marketing_lead_by_fingerprint(p_fingerprint text)
RETURNS SETOF marketing_leads
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM marketing_leads
  WHERE device_fingerprint = p_fingerprint
  LIMIT 1;
$$;

-- Create a security definer function for safe lead update
CREATE OR REPLACE FUNCTION public.update_marketing_lead_by_fingerprint(
  p_fingerprint text,
  p_shared boolean DEFAULT NULL,
  p_prize_id text DEFAULT NULL,
  p_spins_used integer DEFAULT NULL,
  p_converted boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE marketing_leads
  SET 
    shared = COALESCE(p_shared, shared),
    prize_id = COALESCE(p_prize_id, prize_id),
    spins_used = COALESCE(p_spins_used, spins_used),
    converted = COALESCE(p_converted, converted)
  WHERE device_fingerprint = p_fingerprint;
END;
$$;

-- Now block all anon SELECT and UPDATE (use RPCs instead)
CREATE POLICY "Block anon select on marketing_leads" ON marketing_leads
  FOR SELECT TO anon
  USING (false);

CREATE POLICY "Block anon update on marketing_leads" ON marketing_leads
  FOR UPDATE TO anon
  USING (false)
  WITH CHECK (false);

-- ==========================================
-- FIX 2: Add admin checks to tournament SECURITY DEFINER functions
-- ==========================================

-- Add sovereign/admin check to complete_qualification_phase
CREATE OR REPLACE FUNCTION public.complete_qualification_phase(tournament_id_param uuid, phase_id_param uuid, top_n integer DEFAULT 16)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has admin or sovereign role
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sovereign')) THEN
    RAISE EXCEPTION 'Admin or sovereign access required';
  END IF;

  WITH top_barbers AS (
    SELECT barber_id
    FROM tournament_standings
    WHERE tournament_id = tournament_id_param AND phase_id = phase_id_param
    ORDER BY rank ASC
    LIMIT top_n
  )
  UPDATE tournament_standings
  SET qualified = TRUE, updated_at = NOW()
  WHERE tournament_id = tournament_id_param 
    AND phase_id = phase_id_param
    AND barber_id IN (SELECT barber_id FROM top_barbers);
  
  UPDATE tournament_phases
  SET status = 'completed', end_date = NOW()
  WHERE id = phase_id_param;
  
  UPDATE tournaments
  SET status = 'elimination', updated_at = NOW()
  WHERE id = tournament_id_param;
END;
$$;

-- Add admin check to generate_elimination_bracket
CREATE OR REPLACE FUNCTION public.generate_elimination_bracket(tournament_id_param uuid, num_participants integer DEFAULT 16)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phase_id UUID;
  v_qualified_barbers UUID[];
  v_round_name TEXT;
  v_match_count INTEGER;
  i INTEGER;
  v_qual_phase_id UUID;
BEGIN
  -- Verify caller has admin or sovereign role
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sovereign')) THEN
    RAISE EXCEPTION 'Admin or sovereign access required';
  END IF;

  SELECT id INTO v_qual_phase_id
  FROM tournament_phases
  WHERE tournament_id = tournament_id_param AND phase_type = 'qualification'
  ORDER BY phase_order ASC
  LIMIT 1;
  
  SELECT ARRAY_AGG(barber_id ORDER BY rank ASC)
  INTO v_qualified_barbers
  FROM tournament_standings
  WHERE tournament_id = tournament_id_param 
    AND phase_id = v_qual_phase_id
    AND qualified = TRUE
  LIMIT num_participants;
  
  v_round_name := CASE num_participants
    WHEN 16 THEN 'Round of 16'
    WHEN 8 THEN 'Quarterfinals'
    WHEN 4 THEN 'Semifinals'
    WHEN 2 THEN 'Final'
    ELSE 'Elimination'
  END;
  
  INSERT INTO tournament_phases (
    tournament_id, phase_name, phase_type, phase_order, status
  ) VALUES (
    tournament_id_param, v_round_name, 'elimination', 2, 'pending'
  ) RETURNING id INTO v_phase_id;
  
  v_match_count := num_participants / 2;
  FOR i IN 1..v_match_count LOOP
    INSERT INTO bracket_matches (
      tournament_id, phase_id, round_name, round_number, match_number,
      seed1, seed2, barber1_id, barber2_id, status, bracket_position
    ) VALUES (
      tournament_id_param, v_phase_id, v_round_name, 1, i,
      i, num_participants - i + 1,
      v_qualified_barbers[i], v_qualified_barbers[num_participants - i + 1],
      'pending', i
    );
  END LOOP;
END;
$$;

-- Convert read-only aggregation functions to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.get_public_creator_profiles()
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text, bio text, country_code text, follower_count integer, like_count integer, subscription_count integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  select p.user_id,
         p.display_name,
         p.username,
         p.avatar_url,
         p.bio,
         p.country_code,
         coalesce(f.followers, 0)::int as follower_count,
         coalesce(l.likes, 0)::int as like_count,
         coalesce(s.subs, 0)::int as subscription_count
  from public.profiles p
  left join (
    select creator_id, count(*) as followers
    from public.creator_follows
    group by creator_id
  ) f on f.creator_id = p.user_id
  left join (
    select creator_id, count(*) as likes
    from public.creator_likes
    group by creator_id
  ) l on l.creator_id = p.user_id
  left join (
    select creator_id, count(*) as subs
    from public.creator_subscriptions
    group by creator_id
  ) s on s.creator_id = p.user_id
  where coalesce(p.user_type, 'fan') = 'barber' or coalesce(p.is_creator, false) = true;
$$;

CREATE OR REPLACE FUNCTION public.get_creator_summary(_creator_id uuid)
RETURNS TABLE(follower_count integer, like_count integer, subscription_count integer, total_donated_cents integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  select
    (select count(*)::int from public.creator_follows where creator_id = _creator_id) as follower_count,
    (select count(*)::int from public.creator_likes where creator_id = _creator_id) as like_count,
    (select count(*)::int from public.creator_subscriptions where creator_id = _creator_id) as subscription_count,
    (select coalesce(sum(amount_cents)::int, 0) from public.donations where creator_id = _creator_id and status = 'paid') as total_donated_cents;
$$;
