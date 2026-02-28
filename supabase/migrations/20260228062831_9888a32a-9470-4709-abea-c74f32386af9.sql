
-- INSERT
DROP POLICY IF EXISTS "Admins can create sponsor ads" ON sponsor_ads;
CREATE POLICY "Admins and sovereigns can create sponsor ads"
ON sponsor_ads FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sovereign'));

-- UPDATE
DROP POLICY IF EXISTS "Admins can update sponsor ads" ON sponsor_ads;
CREATE POLICY "Admins and sovereigns can update sponsor ads"
ON sponsor_ads FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sovereign'));

-- DELETE
DROP POLICY IF EXISTS "Admins can delete sponsor ads" ON sponsor_ads;
CREATE POLICY "Admins and sovereigns can delete sponsor ads"
ON sponsor_ads FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sovereign'));

-- SELECT (admin-level full view)
DROP POLICY IF EXISTS "Admins can view all sponsor ads" ON sponsor_ads;
CREATE POLICY "Admins and sovereigns can view all sponsor ads"
ON sponsor_ads FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sovereign'));
