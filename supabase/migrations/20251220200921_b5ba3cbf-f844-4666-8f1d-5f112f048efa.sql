-- Add stake and pot columns to open_challenges
ALTER TABLE open_challenges 
ADD COLUMN IF NOT EXISTS stake_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS opponent_stake_matched BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pot_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS donations_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_fee_collected INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES profiles(user_id);

-- Create battle_donations table for live donation feed
CREATE TABLE IF NOT EXISTS battle_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES open_challenges(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES profiles(user_id),
  recipient_barber_id UUID REFERENCES profiles(user_id),
  amount_bb INTEGER NOT NULL CHECK (amount_bb > 0),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT donation_target_check CHECK (
    (battle_id IS NOT NULL AND challenge_id IS NULL) OR 
    (battle_id IS NULL AND challenge_id IS NOT NULL)
  )
);

-- Enable RLS on battle_donations
ALTER TABLE battle_donations ENABLE ROW LEVEL SECURITY;

-- Anyone can view donations (for live feed)
CREATE POLICY "Anyone can view battle donations"
ON battle_donations FOR SELECT
USING (true);

-- Authenticated users can insert donations (actual deduction handled by edge function)
CREATE POLICY "System can insert donations"
ON battle_donations FOR INSERT
WITH CHECK (false);

-- Create index for fast lookups
CREATE INDEX idx_battle_donations_battle_id ON battle_donations(battle_id);
CREATE INDEX idx_battle_donations_challenge_id ON battle_donations(challenge_id);
CREATE INDEX idx_battle_donations_created_at ON battle_donations(created_at DESC);

-- Create index for open_challenges stake lookups
CREATE INDEX idx_open_challenges_status_stake ON open_challenges(status, stake_amount) WHERE stake_amount > 0;