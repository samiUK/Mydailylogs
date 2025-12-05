-- Create superuser audit log table
CREATE TABLE IF NOT EXISTS superuser_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(50) NOT NULL, -- 'add', 'update', 'remove'
  target_email VARCHAR(255) NOT NULL, -- Email of the superuser being modified
  performed_by VARCHAR(255) NOT NULL, -- Email of the person performing the action
  details TEXT, -- Additional details about the action
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_superuser_audit_logs_created_at ON superuser_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_superuser_audit_logs_target_email ON superuser_audit_logs(target_email);

-- Add RLS policy for master admins only
ALTER TABLE superuser_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can view audit logs" ON superuser_audit_logs
  FOR SELECT
  USING (true); -- Will be controlled by API authentication
