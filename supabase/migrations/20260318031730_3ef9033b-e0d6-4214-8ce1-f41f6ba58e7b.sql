
DROP POLICY IF EXISTS "Service role can manage prizes" ON public.user_prizes;

CREATE POLICY "Block client inserts" ON public.user_prizes
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Block client updates" ON public.user_prizes
  FOR UPDATE USING (false);

CREATE POLICY "Block client deletes" ON public.user_prizes
  FOR DELETE USING (false);
