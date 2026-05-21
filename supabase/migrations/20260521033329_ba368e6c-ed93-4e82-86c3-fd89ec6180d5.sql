
-- Extend affiliate_products with optional management fields
ALTER TABLE public.affiliate_products
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS merchant_label text;

-- Allow admin role (in addition to sovereign) to manage affiliate products
DROP POLICY IF EXISTS "Admins can manage affiliate products" ON public.affiliate_products;
CREATE POLICY "Admins can manage affiliate products"
  ON public.affiliate_products
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sovereign'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sovereign'::app_role));

-- Allow sovereign role to manage official gear (products) too, not just admin
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sovereign'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sovereign'::app_role));

-- Affiliate media storage bucket (public read, admin/sovereign write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('affiliate-media', 'affiliate-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read affiliate-media" ON storage.objects;
CREATE POLICY "Public read affiliate-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'affiliate-media');

DROP POLICY IF EXISTS "Admins upload affiliate-media" ON storage.objects;
CREATE POLICY "Admins upload affiliate-media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'affiliate-media' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sovereign'::app_role)));

DROP POLICY IF EXISTS "Admins update affiliate-media" ON storage.objects;
CREATE POLICY "Admins update affiliate-media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'affiliate-media' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sovereign'::app_role)));

DROP POLICY IF EXISTS "Admins delete affiliate-media" ON storage.objects;
CREATE POLICY "Admins delete affiliate-media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'affiliate-media' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sovereign'::app_role)));
