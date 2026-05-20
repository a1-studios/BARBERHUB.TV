
-- Extend products table with shopify + ordering fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shopify_product_id text,
  ADD COLUMN IF NOT EXISTS shopify_variant_id text,
  ADD COLUMN IF NOT EXISTS requires_shipping boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.product_orders
  ADD COLUMN IF NOT EXISTS shopify_order_id text;

-- Admin RLS on products
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Gear media storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('gear-media', 'gear-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read gear-media" ON storage.objects;
CREATE POLICY "Public read gear-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gear-media');

DROP POLICY IF EXISTS "Admins upload gear-media" ON storage.objects;
CREATE POLICY "Admins upload gear-media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gear-media' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update gear-media" ON storage.objects;
CREATE POLICY "Admins update gear-media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'gear-media' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete gear-media" ON storage.objects;
CREATE POLICY "Admins delete gear-media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'gear-media' AND public.has_role(auth.uid(), 'admin'));
