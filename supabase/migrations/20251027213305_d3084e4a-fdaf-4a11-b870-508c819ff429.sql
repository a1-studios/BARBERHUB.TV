-- Create community_notes table for global community feed
CREATE TABLE IF NOT EXISTS public.community_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  tagged_creator_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.community_notes ENABLE ROW LEVEL SECURITY;

-- Everyone can view community notes
CREATE POLICY "Anyone can view community notes"
  ON public.community_notes
  FOR SELECT
  USING (true);

-- Authenticated users can create notes
CREATE POLICY "Authenticated users can create notes"
  ON public.community_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update their own notes"
  ON public.community_notes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete their own notes"
  ON public.community_notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_community_notes_created_at ON public.community_notes(created_at DESC);
CREATE INDEX idx_community_notes_user_id ON public.community_notes(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_community_notes_updated_at
  BEFORE UPDATE ON public.community_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();