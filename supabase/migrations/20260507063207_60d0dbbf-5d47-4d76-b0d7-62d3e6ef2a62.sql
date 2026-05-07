
ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS prize_tier text;

CREATE INDEX IF NOT EXISTS idx_marketing_leads_prize_tier ON public.marketing_leads(prize_tier);
