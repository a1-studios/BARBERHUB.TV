
-- 1) barber_blocked_slots: restrict SELECT to authenticated (removes always-true public policy)
DROP POLICY IF EXISTS "Anyone can view blocked slots" ON public.barber_blocked_slots;
CREATE POLICY "Authenticated users can view blocked slots"
  ON public.barber_blocked_slots
  FOR SELECT
  TO authenticated
  USING (true);

-- 2) battle_chat_messages: restrict INSERT to authenticated role only
DROP POLICY IF EXISTS "Users can send messages" ON public.battle_chat_messages;
CREATE POLICY "Authenticated users can send messages"
  ON public.battle_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3) barber_subscriptions: revoke client access to raw Stripe identifiers
REVOKE SELECT (stripe_customer_id, stripe_subscription_id)
  ON public.barber_subscriptions FROM anon, authenticated;

-- 4) profiles: remove anonymous blanket read; rely on public_user_profiles view for anon
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
