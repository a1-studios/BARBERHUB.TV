
DROP POLICY IF EXISTS "Admins upload gear-media" ON storage.objects;
DROP POLICY IF EXISTS "Admins update gear-media" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete gear-media" ON storage.objects;

CREATE POLICY "Admins upload gear-media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gear-media' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'sovereign'::app_role)));

CREATE POLICY "Admins update gear-media" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'gear-media' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'sovereign'::app_role)));

CREATE POLICY "Admins delete gear-media" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'gear-media' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'sovereign'::app_role)));
