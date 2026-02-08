
-- Create sponsor_ads table
CREATE TABLE public.sponsor_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  highlight_end INTEGER NOT NULL DEFAULT 15,
  logo_url TEXT,
  link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sponsor_ads ENABLE ROW LEVEL SECURITY;

-- Public can read active ads (ticker is public)
CREATE POLICY "Anyone can view active sponsor ads"
  ON public.sponsor_ads
  FOR SELECT
  USING (is_active = true);

-- Admins can view all ads (including inactive)
CREATE POLICY "Admins can view all sponsor ads"
  ON public.sponsor_ads
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert
CREATE POLICY "Admins can create sponsor ads"
  ON public.sponsor_ads
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update
CREATE POLICY "Admins can update sponsor ads"
  ON public.sponsor_ads
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete
CREATE POLICY "Admins can delete sponsor ads"
  ON public.sponsor_ads
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_sponsor_ads_updated_at
  BEFORE UPDATE ON public.sponsor_ads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create sponsor-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
  VALUES ('sponsor-logos', 'sponsor-logos', true);

-- Public read access for sponsor logos
CREATE POLICY "Anyone can view sponsor logos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'sponsor-logos');

-- Admins can upload sponsor logos
CREATE POLICY "Admins can upload sponsor logos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'sponsor-logos' AND has_role(auth.uid(), 'admin'::app_role));

-- Admins can update sponsor logos
CREATE POLICY "Admins can update sponsor logos"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'sponsor-logos' AND has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete sponsor logos
CREATE POLICY "Admins can delete sponsor logos"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'sponsor-logos' AND has_role(auth.uid(), 'admin'::app_role));
