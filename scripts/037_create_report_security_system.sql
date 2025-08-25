-- Enhanced Report Security System
-- This script creates comprehensive security measures for report protection

-- 1. Create audit logging table for all report operations
CREATE TABLE IF NOT EXISTS public.report_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  organization_id uuid REFERENCES public.organizations(id),
  report_id uuid, -- Can reference submitted_reports or daily_checklists
  report_type text NOT NULL CHECK (report_type IN ('submitted_report', 'daily_checklist', 'external_submission')),
  action text NOT NULL CHECK (action IN ('view', 'export', 'delete', 'restore', 'create', 'update')),
  ip_address inet,
  user_agent text,
  details jsonb, -- Additional context about the action
  risk_level text DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add granular report permissions to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS report_permissions jsonb DEFAULT '{
  "view": true, 
  "export": false, 
  "delete": false, 
  "restore": false,
  "audit_access": false
}'::jsonb;

-- 3. Create report access sessions table for enhanced session management
CREATE TABLE IF NOT EXISTS public.report_access_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  session_token text UNIQUE NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  last_activity timestamp with time zone DEFAULT timezone('utc'::text, now()),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create report backup metadata table
CREATE TABLE IF NOT EXISTS public.report_backups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('submitted_report', 'daily_checklist', 'external_submission')),
  backup_data jsonb NOT NULL, -- Full report data snapshot
  backup_reason text NOT NULL CHECK (backup_reason IN ('scheduled', 'pre_deletion', 'manual', 'security')),
  created_by uuid REFERENCES auth.users(id),
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable RLS on all new security tables
ALTER TABLE public.report_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_access_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_backups ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for audit logs (admin and master admin only)
CREATE POLICY "Only admins can view audit logs" ON public.report_audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND organization_id = report_audit_logs.organization_id
    )
  );

CREATE POLICY "System can insert audit logs" ON public.report_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true); -- Allow system to log all actions

-- 7. Create RLS policies for access sessions
CREATE POLICY "Users can view their own sessions" ON public.report_access_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own sessions" ON public.report_access_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- 8. Create RLS policies for report backups
CREATE POLICY "Admins can view organization backups" ON public.report_backups
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND organization_id = report_backups.organization_id
    )
  );

CREATE POLICY "System can create backups" ON public.report_backups
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR organization_id = report_backups.organization_id)
    )
  );

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_audit_logs_user_id ON public.report_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_report_audit_logs_report_id ON public.report_audit_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_report_audit_logs_action ON public.report_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_report_audit_logs_created_at ON public.report_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_report_access_sessions_user_id ON public.report_access_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_report_access_sessions_expires_at ON public.report_access_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_report_backups_report_id ON public.report_backups(report_id);
CREATE INDEX IF NOT EXISTS idx_report_backups_organization_id ON public.report_backups(organization_id);

-- 10. Create function to automatically log report access
CREATE OR REPLACE FUNCTION log_report_access()
RETURNS trigger AS $$
BEGIN
  -- Log the access attempt
  INSERT INTO public.report_audit_logs (
    user_id,
    organization_id,
    report_id,
    report_type,
    action,
    details,
    risk_level
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.organization_id, OLD.organization_id),
    COALESCE(NEW.id, OLD.id),
    TG_TABLE_NAME::text,
    CASE TG_OP
      WHEN 'INSERT' THEN 'create'
      WHEN 'UPDATE' THEN 'update'
      WHEN 'DELETE' THEN 'delete'
      ELSE 'view'
    END,
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', NOW()
    ),
    CASE TG_OP
      WHEN 'DELETE' THEN 'critical'
      WHEN 'UPDATE' THEN 'medium'
      ELSE 'low'
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create triggers for automatic audit logging
DROP TRIGGER IF EXISTS audit_submitted_reports ON public.submitted_reports;
CREATE TRIGGER audit_submitted_reports
  AFTER INSERT OR UPDATE OR DELETE ON public.submitted_reports
  FOR EACH ROW EXECUTE FUNCTION log_report_access();

DROP TRIGGER IF EXISTS audit_daily_checklists ON public.daily_checklists;
CREATE TRIGGER audit_daily_checklists
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_checklists
  FOR EACH ROW EXECUTE FUNCTION log_report_access();

-- 12. Update existing profiles with default report permissions for admins
UPDATE public.profiles 
SET report_permissions = '{
  "view": true, 
  "export": true, 
  "delete": true, 
  "restore": true,
  "audit_access": true
}'::jsonb
WHERE role = 'admin';

-- 13. Create function to create automatic backups before deletion
CREATE OR REPLACE FUNCTION create_report_backup()
RETURNS trigger AS $$
BEGIN
  -- Create backup before deletion
  INSERT INTO public.report_backups (
    report_id,
    report_type,
    backup_data,
    backup_reason,
    created_by,
    organization_id
  ) VALUES (
    OLD.id,
    TG_TABLE_NAME::text,
    to_jsonb(OLD),
    'pre_deletion',
    auth.uid(),
    OLD.organization_id
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Create backup triggers
DROP TRIGGER IF EXISTS backup_submitted_reports ON public.submitted_reports;
CREATE TRIGGER backup_submitted_reports
  BEFORE DELETE ON public.submitted_reports
  FOR EACH ROW EXECUTE FUNCTION create_report_backup();

DROP TRIGGER IF EXISTS backup_daily_checklists ON public.daily_checklists;
CREATE TRIGGER backup_daily_checklists
  BEFORE DELETE ON public.daily_checklists
  FOR EACH ROW EXECUTE FUNCTION create_report_backup();
