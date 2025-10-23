-- Clean up duplicate barber_profiles (keep the latest per user_id)
WITH ranked AS (
  SELECT id, user_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM public.barber_profiles
)
DELETE FROM public.barber_profiles bp
USING ranked r
WHERE bp.id = r.id AND r.rn > 1;

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.barber_profiles
ADD CONSTRAINT barber_profiles_user_id_key UNIQUE (user_id);

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket
CREATE POLICY "avatars_read_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_auth"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "avatars_update_auth"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "avatars_delete_auth"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);