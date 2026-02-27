
-- Create challenge_prize_pool table (jackpot style, separate from category pools)
CREATE TABLE public.challenge_prize_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_year integer NOT NULL DEFAULT EXTRACT(year FROM now())::integer,
  total_pool_bb integer NOT NULL DEFAULT 0,
  total_challenges_completed integer NOT NULL DEFAULT 0,
  platform_fees_collected_bb integer NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- RLS: anyone can view, only system can modify
ALTER TABLE public.challenge_prize_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view challenge prize pool"
  ON public.challenge_prize_pool FOR SELECT
  USING (true);

CREATE POLICY "System can manage challenge prize pool"
  ON public.challenge_prize_pool FOR ALL
  USING (false);

-- Seed current year row
INSERT INTO public.challenge_prize_pool (pool_year) VALUES (EXTRACT(year FROM now())::integer);

-- Add duration and expiration columns to open_challenges
ALTER TABLE public.open_challenges
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;
