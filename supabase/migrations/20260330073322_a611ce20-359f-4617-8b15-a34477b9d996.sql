
-- ============================================================
-- 1. Fix marketing_leads: Replace broad read with admin-only
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read marketing_leads" ON public.marketing_leads;
CREATE POLICY "Admins can read marketing_leads"
  ON public.marketing_leads
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sovereign'));

-- ============================================================
-- 2. Fix referral_tracking: Replace overly permissive "System can manage referrals"
-- ============================================================
DROP POLICY IF EXISTS "System can manage referrals" ON public.referral_tracking;
-- Users can only see their own referrals
CREATE POLICY "Users can read own referrals"
  ON public.referral_tracking
  FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- ============================================================
-- 3. Fix user_vote_combos: Replace full exposure with owner-only
-- ============================================================
DROP POLICY IF EXISTS "System can manage combos" ON public.user_vote_combos;
CREATE POLICY "Users can read own combos"
  ON public.user_vote_combos
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. Fix system INSERT policies - drop overly permissive ones
--    Edge functions use service role key which bypasses RLS
-- ============================================================
DROP POLICY IF EXISTS "System can insert transactions" ON public.earning_transactions;
DROP POLICY IF EXISTS "System can insert milestones" ON public.creator_milestones;
DROP POLICY IF EXISTS "System can insert orders" ON public.orders;
DROP POLICY IF EXISTS "System can update orders" ON public.orders;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert platform transactions" ON public.platform_transactions;
DROP POLICY IF EXISTS "System can insert action logs" ON public.admin_action_logs;
DROP POLICY IF EXISTS "System can insert audit log" ON public.sovereign_audit_log;

-- ============================================================
-- 5. Fix storage policies: Use has_role instead of user_type
-- ============================================================
DROP POLICY IF EXISTS "Barbers can upload creation files" ON storage.objects;
CREATE POLICY "Barbers can upload creation files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'creations' AND
    public.has_role(auth.uid(), 'barber')
  );

DROP POLICY IF EXISTS "Barbers can manage portfolio files" ON storage.objects;
CREATE POLICY "Barbers can manage portfolio files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'portfolios' AND
    public.has_role(auth.uid(), 'barber')
  )
  WITH CHECK (
    bucket_id = 'portfolios' AND
    public.has_role(auth.uid(), 'barber')
  );
