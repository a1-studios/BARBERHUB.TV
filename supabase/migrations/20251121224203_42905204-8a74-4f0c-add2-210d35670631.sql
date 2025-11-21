-- Create admin action logs table
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create system announcements table
CREATE TABLE IF NOT EXISTS system_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_action_logs
CREATE POLICY "Admins can view all action logs"
ON admin_action_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert action logs"
ON admin_action_logs FOR INSERT
WITH CHECK (true);

-- RLS Policies for system_announcements
CREATE POLICY "Everyone can view active announcements"
ON system_announcements FOR SELECT
USING (active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage announcements"
ON system_announcements FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_admin_action_logs_admin_id ON admin_action_logs(admin_id);
CREATE INDEX idx_admin_action_logs_created_at ON admin_action_logs(created_at DESC);
CREATE INDEX idx_system_announcements_active ON system_announcements(active, priority DESC) WHERE active = true;