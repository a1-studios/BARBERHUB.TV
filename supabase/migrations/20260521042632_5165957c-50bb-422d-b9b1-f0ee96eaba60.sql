
-- Safety: ensure profile columns exist (they already do, this is a no-op guard)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 150),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_video_created
  ON public.comments (video_id, created_at DESC)
  WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments (user_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Public can read live comments" ON public.comments;
CREATE POLICY "Public can read live comments"
  ON public.comments FOR SELECT
  USING (is_deleted = false);

DROP POLICY IF EXISTS "Users insert own comments" ON public.comments;
CREATE POLICY "Users insert own comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authors soft-delete own comments" ON public.comments;
CREATE POLICY "Authors soft-delete own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_deleted = true);

-- Mentions table
CREATE TABLE IF NOT EXISTS public.comment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comment_mentions_user ON public.comment_mentions (mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment ON public.comment_mentions (comment_id);

ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read mentions" ON public.comment_mentions;
CREATE POLICY "Public read mentions"
  ON public.comment_mentions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Comment authors insert mentions" ON public.comment_mentions;
CREATE POLICY "Comment authors insert mentions"
  ON public.comment_mentions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_id AND c.user_id = auth.uid()
    )
  );

-- Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'comments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.comments';
  END IF;
END $$;
