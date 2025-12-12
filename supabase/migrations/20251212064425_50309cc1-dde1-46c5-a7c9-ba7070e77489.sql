-- Phase 3A: Prize Pool & Platform Fee System

-- Table to track prize pools per category per tournament year
CREATE TABLE public.category_prize_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  tournament_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  total_pool_cents INTEGER NOT NULL DEFAULT 0,
  entry_contributions_cents INTEGER NOT NULL DEFAULT 0,
  donation_contributions_cents INTEGER NOT NULL DEFAULT 0,
  platform_fees_collected_cents INTEGER NOT NULL DEFAULT 0,
  participant_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, tournament_year)
);

-- Table to log all platform fee transactions for auditing
CREATE TABLE public.platform_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL, -- 'donation_fee', 'entry_fee', 'bb_purchase_fee', 'prize_pool_contribution'
  source_user_id UUID REFERENCES public.profiles(user_id),
  amount_cents INTEGER NOT NULL,
  category TEXT, -- Which category benefits (if applicable)
  reference_id UUID, -- Original transaction ID (donation, order, etc.)
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform configuration table for fee structure and settings
CREATE TABLE public.platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default fee configuration
INSERT INTO public.platform_config (key, value, description) VALUES 
  ('fee_structure', '{
    "donation_fee_percent": 10,
    "entry_fee_to_pool_percent": 60,
    "entry_fee_to_platform_percent": 40,
    "bb_purchase_fee_percent": 5
  }'::jsonb, 'Platform fee percentages for various transaction types'),
  ('prize_pool_goals', '{
    "speed_fade": 50000,
    "gentleman_cut": 50000,
    "creative_color": 50000,
    "viral_styles": 50000,
    "beard_scissor": 50000
  }'::jsonb, 'Goal amounts in cents for each category prize pool');

-- Initialize prize pools for 2026 tournament
INSERT INTO public.category_prize_pools (category, tournament_year) VALUES
  ('speed_fade', 2026),
  ('gentleman_cut', 2026),
  ('creative_color', 2026),
  ('viral_styles', 2026),
  ('beard_scissor', 2026);

-- Enable RLS
ALTER TABLE public.category_prize_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for category_prize_pools (public read, system write)
CREATE POLICY "Anyone can view prize pools"
  ON public.category_prize_pools FOR SELECT
  USING (true);

CREATE POLICY "System can manage prize pools"
  ON public.category_prize_pools FOR ALL
  USING (false);

-- RLS Policies for platform_transactions (admin read, system write)
CREATE POLICY "Admins can view platform transactions"
  ON public.platform_transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert platform transactions"
  ON public.platform_transactions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for platform_config (public read, admin write)
CREATE POLICY "Anyone can view platform config"
  ON public.platform_config FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify platform config"
  ON public.platform_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to update prize pool
CREATE OR REPLACE FUNCTION public.update_category_prize_pool(
  p_category TEXT,
  p_entry_amount_cents INTEGER DEFAULT 0,
  p_donation_amount_cents INTEGER DEFAULT 0,
  p_platform_fee_cents INTEGER DEFAULT 0,
  p_increment_participants BOOLEAN DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO category_prize_pools (category, tournament_year, total_pool_cents, entry_contributions_cents, donation_contributions_cents, platform_fees_collected_cents, participant_count)
  VALUES (
    p_category,
    EXTRACT(YEAR FROM NOW())::INTEGER,
    p_entry_amount_cents + p_donation_amount_cents,
    p_entry_amount_cents,
    p_donation_amount_cents,
    p_platform_fee_cents,
    CASE WHEN p_increment_participants THEN 1 ELSE 0 END
  )
  ON CONFLICT (category, tournament_year) DO UPDATE SET
    total_pool_cents = category_prize_pools.total_pool_cents + EXCLUDED.total_pool_cents,
    entry_contributions_cents = category_prize_pools.entry_contributions_cents + EXCLUDED.entry_contributions_cents,
    donation_contributions_cents = category_prize_pools.donation_contributions_cents + EXCLUDED.donation_contributions_cents,
    platform_fees_collected_cents = category_prize_pools.platform_fees_collected_cents + EXCLUDED.platform_fees_collected_cents,
    participant_count = category_prize_pools.participant_count + EXCLUDED.participant_count,
    last_updated = NOW();
END;
$$;

-- Function to get fee structure
CREATE OR REPLACE FUNCTION public.get_fee_structure()
RETURNS JSONB
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM platform_config WHERE key = 'fee_structure';
$$;

-- Create indexes for performance
CREATE INDEX idx_platform_transactions_type ON public.platform_transactions(transaction_type);
CREATE INDEX idx_platform_transactions_category ON public.platform_transactions(category);
CREATE INDEX idx_platform_transactions_created_at ON public.platform_transactions(created_at DESC);
CREATE INDEX idx_category_prize_pools_year ON public.category_prize_pools(tournament_year);