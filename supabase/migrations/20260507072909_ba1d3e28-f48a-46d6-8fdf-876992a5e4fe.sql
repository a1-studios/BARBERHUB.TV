
-- Allow role to be NULL on initial lead capture (OAuth users haven't picked yet)
ALTER TABLE public.marketing_leads ALTER COLUMN role DROP NOT NULL;

-- Track post-OAuth claim linkage and color tier for the wheel reveal
ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS linked_user_id uuid,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS prize_tier_color text;

CREATE INDEX IF NOT EXISTS idx_marketing_leads_linked_user
  ON public.marketing_leads(linked_user_id) WHERE linked_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketing_leads_email_lower
  ON public.marketing_leads(lower(email));
