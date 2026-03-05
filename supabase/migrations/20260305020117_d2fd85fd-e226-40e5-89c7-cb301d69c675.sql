
ALTER TABLE public.battles
  ADD COLUMN IF NOT EXISTS ivs_stream_key TEXT,
  ADD COLUMN IF NOT EXISTS ivs_playback_url TEXT,
  ADD COLUMN IF NOT EXISTS ivs_channel_arn TEXT;

ALTER TABLE public.sponsor_ads
  ADD COLUMN IF NOT EXISTS product_image_url TEXT,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
