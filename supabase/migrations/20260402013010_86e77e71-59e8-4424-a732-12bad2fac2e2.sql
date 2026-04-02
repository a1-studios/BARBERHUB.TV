
CREATE TABLE public.affiliate_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  external_link TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'affiliate',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;

-- Anyone can view active products
CREATE POLICY "Anyone can view active affiliate products"
  ON public.affiliate_products
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Only sovereign can insert
CREATE POLICY "Sovereign can insert affiliate products"
  ON public.affiliate_products
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'sovereign'::app_role));

-- Only sovereign can update
CREATE POLICY "Sovereign can update affiliate products"
  ON public.affiliate_products
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'sovereign'::app_role));

-- Only sovereign can delete
CREATE POLICY "Sovereign can delete affiliate products"
  ON public.affiliate_products
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'sovereign'::app_role));
