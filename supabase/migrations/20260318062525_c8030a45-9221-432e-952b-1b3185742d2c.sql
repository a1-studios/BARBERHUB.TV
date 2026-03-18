ALTER TABLE public.sponsor_ads
  ADD COLUMN IF NOT EXISTS product_image_url_2 text,
  ADD COLUMN IF NOT EXISTS promo_text text DEFAULT '15% off with BB',
  ADD COLUMN IF NOT EXISTS product_link text;