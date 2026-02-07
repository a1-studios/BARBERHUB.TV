-- Add battle_type column to battles table
-- Values: 'official' (tournament battles), 'unofficial' (premium barber hosted), 'challenge' (personal 1v1)
ALTER TABLE public.battles 
ADD COLUMN IF NOT EXISTS battle_type TEXT NOT NULL DEFAULT 'official';

-- Add check constraint for valid values
ALTER TABLE public.battles
ADD CONSTRAINT battles_battle_type_check 
CHECK (battle_type IN ('official', 'unofficial', 'challenge'));

-- Index for filtering by battle_type (used in rankings, leaderboards)
CREATE INDEX IF NOT EXISTS idx_battles_battle_type ON public.battles(battle_type);

-- Update existing challenges/waiting battles to 'challenge' type
UPDATE public.battles 
SET battle_type = 'challenge' 
WHERE status = 'waiting_for_opponent';
