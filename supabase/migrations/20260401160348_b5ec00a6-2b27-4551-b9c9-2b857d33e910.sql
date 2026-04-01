
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS cloudflare_stream_uid TEXT;
ALTER TABLE public.battle_submissions ADD COLUMN IF NOT EXISTS cloudflare_stream_uid TEXT;
ALTER TABLE public.creator_content ADD COLUMN IF NOT EXISTS cloudflare_stream_uid TEXT;
ALTER TABLE public.creations ADD COLUMN IF NOT EXISTS cloudflare_stream_uid TEXT;
