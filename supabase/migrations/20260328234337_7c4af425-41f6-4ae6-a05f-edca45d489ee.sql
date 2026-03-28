
-- Add RPC for marking lead as converted by email (for LandingHero)
CREATE OR REPLACE FUNCTION public.mark_marketing_lead_converted(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE marketing_leads
  SET converted = true
  WHERE email = p_email;
END;
$$;

-- Also need an authenticated SELECT policy for sovereign/admin users
CREATE POLICY "Authenticated users can read marketing_leads" ON marketing_leads
  FOR SELECT TO authenticated
  USING (true);
