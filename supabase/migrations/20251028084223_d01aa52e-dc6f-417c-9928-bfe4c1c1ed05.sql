-- Create open_challenges table
CREATE TABLE IF NOT EXISTS public.open_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenger_username TEXT NOT NULL,
  title TEXT NOT NULL,
  challenger_stream_url TEXT NOT NULL,
  challenger_youtube_video_id TEXT,
  status TEXT DEFAULT 'waiting_for_opponent' CHECK (status IN ('waiting_for_opponent', 'completed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by_username TEXT,
  accepted_at TIMESTAMPTZ,
  battle_id UUID REFERENCES public.battles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.open_challenges ENABLE ROW LEVEL SECURITY;

-- Anyone can view waiting challenges
CREATE POLICY "Anyone can view waiting challenges"
  ON public.open_challenges FOR SELECT
  USING (status = 'waiting_for_opponent' OR auth.uid() = challenger_id OR auth.uid() = accepted_by_id);

-- Barbers can create challenges
CREATE POLICY "Barbers can create challenges"
  ON public.open_challenges FOR INSERT
  WITH CHECK (
    auth.uid() = challenger_id AND
    has_role(auth.uid(), 'barber'::app_role)
  );

-- System can update challenges (for edge function)
CREATE POLICY "System can update challenges"
  ON public.open_challenges FOR UPDATE
  USING (true);

-- Enable real-time
ALTER TABLE public.open_challenges REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.open_challenges;