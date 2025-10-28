-- Make barber2_id nullable to support waiting_for_opponent status
ALTER TABLE battles 
  ALTER COLUMN barber2_id DROP NOT NULL;

-- Add bounty/prize fields to open_challenges
ALTER TABLE open_challenges 
  ADD COLUMN bounty_amount INTEGER,
  ADD COLUMN bounty_currency TEXT DEFAULT 'USD',
  ADD COLUMN bounty_description TEXT;