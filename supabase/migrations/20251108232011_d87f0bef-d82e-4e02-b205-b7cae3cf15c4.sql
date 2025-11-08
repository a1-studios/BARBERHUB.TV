-- Create tournament_queue table for matchmaking system
CREATE TABLE IF NOT EXISTS public.tournament_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barber_profile_id UUID NOT NULL REFERENCES public.barber_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  country_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  queue_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  matched_battle_id UUID REFERENCES public.battles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('waiting', 'matched', 'disqualified', 'expired'))
);

-- Enable RLS
ALTER TABLE public.tournament_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own queue entries"
  ON public.tournament_queue
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Barbers can insert their own queue entries"
  ON public.tournament_queue
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND has_role(auth.uid(), 'barber'::app_role)
  );

CREATE POLICY "System can update queue entries"
  ON public.tournament_queue
  FOR UPDATE
  USING (true);

-- Create index for efficient matchmaking queries
CREATE INDEX idx_tournament_queue_category_status 
  ON public.tournament_queue(category, status, queue_timestamp);

CREATE INDEX idx_tournament_queue_country 
  ON public.tournament_queue(country_code, status);

-- Add trigger for updated_at
CREATE TRIGGER update_tournament_queue_updated_at
  BEFORE UPDATE ON public.tournament_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.tournament_queue IS 'Queue system for tournament matchmaking with international rivalry logic';
COMMENT ON COLUMN public.tournament_queue.status IS 'waiting: in queue | matched: paired with opponent | disqualified: removed due to strikes | expired: entry expired';
COMMENT ON COLUMN public.tournament_queue.queue_timestamp IS 'Used for FIFO matching - oldest entries matched first within priority groups';