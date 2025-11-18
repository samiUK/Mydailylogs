-- Create impersonation activity logs table to track all actions performed while impersonated
CREATE TABLE IF NOT EXISTS impersonation_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL, -- Master admin or superuser who initiated impersonation
  admin_type TEXT NOT NULL CHECK (admin_type IN ('masteradmin', 'support')),
  impersonated_user_id UUID NOT NULL REFERENCES profiles(id),
  impersonated_user_email TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(organization_id),
  action_type TEXT NOT NULL, -- e.g., 'profile_update', 'password_change', 'settings_change', 'data_access'
  action_details JSONB, -- Detailed information about the action
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')) DEFAULT 'low'
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin_email ON impersonation_activity_logs(admin_email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON impersonation_activity_logs(impersonated_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_id ON impersonation_activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON impersonation_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_risk_level ON impersonation_activity_logs(risk_level);

-- Enable RLS
ALTER TABLE impersonation_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only master admin and superusers can view activity logs
CREATE POLICY "Master admin and superusers can view activity logs"
  ON impersonation_activity_logs
  FOR SELECT
  USING (true); -- Service role will handle authentication

-- Service role can insert activity logs
CREATE POLICY "Service role can insert activity logs"
  ON impersonation_activity_logs
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE impersonation_activity_logs IS 'Tracks all actions performed by master admin and superusers while impersonating users for security and audit purposes';
