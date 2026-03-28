
-- Drop the existing ALL policy that requires has_role
DROP POLICY IF EXISTS "Barbers can manage their own creations" ON creations;

-- Separate INSERT policy (no has_role check)
CREATE POLICY "Owners can insert creations" ON creations
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM barber_profiles bp
    WHERE bp.id = creations.barber_id AND bp.user_id = auth.uid()
  ));

-- Separate UPDATE policy
CREATE POLICY "Owners can update creations" ON creations
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM barber_profiles bp
    WHERE bp.id = creations.barber_id AND bp.user_id = auth.uid()
  ));

-- Separate DELETE policy
CREATE POLICY "Owners can delete creations" ON creations
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM barber_profiles bp
    WHERE bp.id = creations.barber_id AND bp.user_id = auth.uid()
  ));
