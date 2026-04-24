-- Live challenge votes: ephemeral pot votes, separate from official battle_votes
CREATE TABLE public.live_challenge_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  picked_barber_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (battle_id, voter_id)
);

ALTER TABLE public.live_challenge_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read live challenge votes"
  ON public.live_challenge_votes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can cast their own live challenge vote"
  ON public.live_challenge_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Users can update their own live challenge vote"
  ON public.live_challenge_votes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = voter_id)
  WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Users can delete their own live challenge vote"
  ON public.live_challenge_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = voter_id);

CREATE INDEX idx_live_challenge_votes_battle ON public.live_challenge_votes (battle_id);
CREATE INDEX idx_live_challenge_votes_picked ON public.live_challenge_votes (battle_id, picked_barber_id);