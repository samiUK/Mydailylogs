-- Create impersonation activity logs table for security auditing
-- Tracks all actions performed by master admin and superusers while impersonating users

CREATE TABLE IF NOT EXISTS public.impersonation_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  impersonator_email TEXT NOT NULL,
  impersonator_type TEXT NOT NULL CHECK (impersonator_type IN ('master_admin', 'superuser')),
  target_user_email TEXT NOT NULL,
  target_organization_id UUID REFERENCES organizations(id),
  action TEXT NOT NULL,
  action_details JSONB,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.impersonation_activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access for logging
CREATE POLICY "Service role can manage activity logs"
  ON public.impersonation_activity_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users (master admin/superusers) to read logs
CREATE POLICY "Authenticated users can read activity logs"
  ON public.impersonation_activity_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_impersonator ON public.impersonation_activity_logs(impersonator_email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target_user ON public.impersonation_activity_logs(target_user_email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.impersonation_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_risk_level ON public.impersonation_activity_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_activity_logs_organization ON public.impersonation_activity_logs(target_organization_id);

-- Auto-cleanup old logs (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.impersonation_activity_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Activity logs indexes created successfully!';
END $$;
