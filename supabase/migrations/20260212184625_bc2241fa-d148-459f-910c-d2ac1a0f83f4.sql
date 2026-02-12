
-- Sponsor Gigs table
CREATE TABLE public.sponsor_gigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  budget_bb INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  charity_percent INTEGER NOT NULL DEFAULT 5,
  slots INTEGER NOT NULL DEFAULT 1,
  applications_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'closed')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsor_gigs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active gigs
CREATE POLICY "Anyone can view active gigs"
  ON public.sponsor_gigs FOR SELECT
  USING (is_active = true AND status = 'open');

-- Sponsors can manage their own gigs
CREATE POLICY "Sponsors can insert their own gigs"
  ON public.sponsor_gigs FOR INSERT
  WITH CHECK (auth.uid() = sponsor_id);

CREATE POLICY "Sponsors can update their own gigs"
  ON public.sponsor_gigs FOR UPDATE
  USING (auth.uid() = sponsor_id);

CREATE POLICY "Sponsors can delete their own gigs"
  ON public.sponsor_gigs FOR DELETE
  USING (auth.uid() = sponsor_id);

-- Trigger for updated_at
CREATE TRIGGER update_sponsor_gigs_updated_at
  BEFORE UPDATE ON public.sponsor_gigs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Gig Applications table
CREATE TABLE public.gig_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.sponsor_gigs(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(gig_id, barber_id)
);

ALTER TABLE public.gig_applications ENABLE ROW LEVEL SECURITY;

-- Barbers can insert their own applications
CREATE POLICY "Barbers can apply to gigs"
  ON public.gig_applications FOR INSERT
  WITH CHECK (auth.uid() = barber_id);

-- Barbers can view their own applications
CREATE POLICY "Barbers can view own applications"
  ON public.gig_applications FOR SELECT
  USING (auth.uid() = barber_id);

-- Sponsors can view applications for their gigs
CREATE POLICY "Sponsors can view applications for their gigs"
  ON public.gig_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sponsor_gigs sg
      WHERE sg.id = gig_id AND sg.sponsor_id = auth.uid()
    )
  );
