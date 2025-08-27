-- Comprehensive RLS Policies for Data Integrity and Security
-- This script creates organization-level data isolation and proper impersonation boundaries

-- Enable RLS on all tables that need organization-level isolation
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submitted_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_schedule_exclusions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their organization's templates" ON checklist_templates;
DROP POLICY IF EXISTS "Users can create templates for their organization" ON checklist_templates;
DROP POLICY IF EXISTS "Users can update their organization's templates" ON checklist_templates;
DROP POLICY IF EXISTS "Users can delete their organization's templates" ON checklist_templates;

-- Helper function to get user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

-- Helper function to check if user is superuser
CREATE OR REPLACE FUNCTION is_superuser()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM superusers s
    JOIN profiles p ON p.email = s.email
    WHERE p.id = auth.uid() AND s.is_active = true
  );
$$;

-- CHECKLIST_TEMPLATES: Organization-level isolation
CREATE POLICY "Organization isolation for templates" ON checklist_templates
  FOR ALL USING (
    organization_id = get_user_organization_id() OR is_superuser()
  );

-- CHECKLIST_ITEMS: Inherit organization from template
CREATE POLICY "Organization isolation for checklist items" ON checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM checklist_templates ct 
      WHERE ct.id = template_id 
      AND (ct.organization_id = get_user_organization_id() OR is_superuser())
    )
  );

-- DAILY_CHECKLISTS: Direct organization isolation
CREATE POLICY "Organization isolation for daily checklists" ON daily_checklists
  FOR ALL USING (
    organization_id = get_user_organization_id() OR is_superuser()
  );

-- TEMPLATE_ASSIGNMENTS: Direct organization isolation
CREATE POLICY "Organization isolation for template assignments" ON template_assignments
  FOR ALL USING (
    organization_id = get_user_organization_id() OR is_superuser()
  );

-- SUBMITTED_REPORTS: Direct organization isolation
CREATE POLICY "Organization isolation for submitted reports" ON submitted_reports
  FOR ALL USING (
    organization_id = get_user_organization_id() OR is_superuser()
  );

-- EXTERNAL_SUBMISSIONS: Direct organization isolation
CREATE POLICY "Organization isolation for external submissions" ON external_submissions
  FOR ALL USING (
    organization_id = get_user_organization_id() OR is_superuser()
  );

-- EXTERNAL_RESPONSES: Inherit organization from submission
CREATE POLICY "Organization isolation for external responses" ON external_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM external_submissions es 
      WHERE es.id = submission_id 
      AND (es.organization_id = get_user_organization_id() OR is_superuser())
    )
  );

-- CHECKLIST_RESPONSES: Inherit organization from daily_checklist
CREATE POLICY "Organization isolation for checklist responses" ON checklist_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM daily_checklists dc 
      WHERE dc.id = checklist_id 
      AND (dc.organization_id = get_user_organization_id() OR is_superuser())
    )
  );

-- NOTIFICATIONS: User-specific with organization context
CREATE POLICY "User-specific notifications" ON notifications
  FOR ALL USING (
    user_id = auth.uid() OR is_superuser()
  );

-- FEEDBACK: Direct organization isolation
CREATE POLICY "Organization isolation for feedback" ON feedback
  FOR ALL USING (
    organization_id = get_user_organization_id() OR is_superuser()
  );

-- HOLIDAYS: Direct organization isolation
CREATE POLICY "Organization isolation for holidays" ON holidays
  FOR ALL USING (
    organization_id = get_user_organization_id() OR is_superuser()
  );

-- STAFF_UNAVAILABILITY: Direct organization isolation
CREATE POLICY "Organization isolation for staff unavailability" ON staff_unavailability
  FOR ALL USING (
    organization_id = get_user_organization_id() OR is_superuser()
  );

-- REPORT_AUDIT_LOGS: Direct organization isolation
CREATE POLICY "Organization isolation for audit logs" ON report_audit_logs
  FOR ALL USING (
    organization_id = get_user_organization_id() OR is_superuser()
  );

-- REPORT_BACKUPS: Direct organization isolation
CREATE POLICY "Organization isolation for report backups" ON report_backups
  FOR ALL USING (
    organization_id = get_user_organization_id() OR is_superuser()
  );

-- TEMPLATE_SCHEDULE_EXCLUSIONS: Direct organization isolation
CREATE POLICY "Organization isolation for schedule exclusions" ON template_schedule_exclusions
  FOR ALL USING (
    organization_id = get_user_organization_id() OR is_superuser()
  );

-- PROFILES: Users can only see profiles in their organization + superuser access
CREATE POLICY "Organization isolation for profiles" ON profiles
  FOR SELECT USING (
    organization_id = get_user_organization_id() OR 
    id = auth.uid() OR 
    is_superuser()
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ORGANIZATIONS: Users can only see their own organization + superuser access
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id = get_user_organization_id() OR is_superuser()
  );

-- Verify policies are working
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Check that RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;
