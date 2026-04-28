-- Add price column to creator_content for Academy courses
ALTER TABLE public.creator_content
  ADD COLUMN IF NOT EXISTS price_bb integer NOT NULL DEFAULT 0;

-- Track Academy course unlocks (paywall ledger)
CREATE TABLE IF NOT EXISTS public.academy_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.creator_content(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  educator_id uuid NOT NULL,
  bb_paid integer NOT NULL DEFAULT 0,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_academy_unlocks_student ON public.academy_unlocks(student_id);
CREATE INDEX IF NOT EXISTS idx_academy_unlocks_educator ON public.academy_unlocks(educator_id);

ALTER TABLE public.academy_unlocks ENABLE ROW LEVEL SECURITY;

-- Students can view their own unlocks
CREATE POLICY "Students view own unlocks"
ON public.academy_unlocks
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- Educators can view unlocks of their content
CREATE POLICY "Educators view their content unlocks"
ON public.academy_unlocks
FOR SELECT
TO authenticated
USING (auth.uid() = educator_id);

-- No client writes — only edge function (service role) inserts
