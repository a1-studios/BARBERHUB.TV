-- Step 1: Fix stream_sessions spectator access
-- Replace wide-open public policy with authenticated-only
DROP POLICY IF EXISTS "Anyone can view stream sessions" ON public.stream_sessions;
CREATE POLICY "Authenticated users can view stream sessions"
  ON public.stream_sessions FOR SELECT
  TO authenticated
  USING (true);

-- Step 2: B2B Educational Gating on creator_content
-- Course teasers restricted to barbers only; all other content visible to authenticated users
DROP POLICY IF EXISTS "Content is viewable by everyone" ON public.creator_content;
CREATE POLICY "Content is viewable by authenticated users with course gating"
  ON public.creator_content FOR SELECT
  TO authenticated
  USING (
    content_type != 'course_teaser'
    OR public.has_role(auth.uid(), 'barber')
  );