
CREATE TABLE public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('user','post','stream')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('harassment','ip_violation','fraud','explicit_content')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can file reports"
  ON public.content_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view reports"
  ON public.content_reports FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sovereign'::app_role));

CREATE POLICY "Admins can update reports"
  ON public.content_reports FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sovereign'::app_role));

CREATE INDEX idx_content_reports_target ON public.content_reports(target_type, target_id);
CREATE INDEX idx_content_reports_status ON public.content_reports(status);
