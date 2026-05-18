ALTER TABLE public.creator_content ADD COLUMN IF NOT EXISTS overlay_payload jsonb;
ALTER TABLE public.creations ADD COLUMN IF NOT EXISTS overlay_payload jsonb;