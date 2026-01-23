-- Create sovereign audit log table for God-Mode actions
CREATE TABLE sovereign_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sovereign_id UUID NOT NULL,
  action_category TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  before_state JSONB,
  after_state JSONB,
  severity TEXT DEFAULT 'normal',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on sovereign_audit_log
ALTER TABLE sovereign_audit_log ENABLE ROW LEVEL SECURITY;

-- Only sovereign can read audit log
CREATE POLICY "Sovereign can read audit log"
ON sovereign_audit_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'sovereign'::app_role));

-- System can insert audit entries
CREATE POLICY "System can insert audit log"
ON sovereign_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create platform state table for kill-switches
CREATE TABLE platform_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

-- Insert default states
INSERT INTO platform_state (key, value) VALUES
  ('battles_paused', 'false'),
  ('economy_frozen', 'false'),
  ('maintenance_mode', 'false'),
  ('registration_paused', 'false');

-- Enable RLS on platform_state
ALTER TABLE platform_state ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read platform state
CREATE POLICY "Anyone can read platform state"
ON platform_state FOR SELECT
TO authenticated
USING (true);

-- Only sovereign can update platform state
CREATE POLICY "Sovereign can update platform state"
ON platform_state FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'sovereign'::app_role));

-- Assign sovereign role to the architect's account
INSERT INTO user_roles (user_id, role)
SELECT au.id, 'sovereign'::app_role
FROM auth.users au
WHERE au.email = 'a1studios.film@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;