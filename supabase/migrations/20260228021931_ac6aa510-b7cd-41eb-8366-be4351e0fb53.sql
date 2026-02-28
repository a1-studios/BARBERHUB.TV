
-- Add INSERT policy for sponsor-logos bucket
CREATE POLICY "Admins and sovereigns can upload sponsor logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'sponsor-logos'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sovereign'))
);

-- Drop and recreate UPDATE policy to include sovereign
DROP POLICY IF EXISTS "Admins can update sponsor logos" ON storage.objects;
CREATE POLICY "Admins and sovereigns can update sponsor logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'sponsor-logos'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sovereign'))
);

-- Drop and recreate DELETE policy to include sovereign
DROP POLICY IF EXISTS "Admins can delete sponsor logos" ON storage.objects;
CREATE POLICY "Admins and sovereigns can delete sponsor logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'sponsor-logos'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sovereign'))
);
