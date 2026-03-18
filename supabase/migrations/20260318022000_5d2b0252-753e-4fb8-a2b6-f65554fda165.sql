CREATE TABLE public.user_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prize_type text NOT NULL,
  prize_label text NOT NULL,
  bb_value integer DEFAULT 0,
  duration_months numeric DEFAULT 0,
  status text DEFAULT 'active',
  claimed_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prizes" ON public.user_prizes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage prizes" ON public.user_prizes
  FOR ALL USING (false);