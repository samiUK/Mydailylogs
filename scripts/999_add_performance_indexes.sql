-- Add indexes to speed up quota queries
CREATE INDEX IF NOT EXISTS idx_profiles_org_role ON profiles(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_log_templates_org_active ON log_templates(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_status ON subscriptions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_submitted_reports_org_submitted ON submitted_reports(organization_id, submitted_at) WHERE deleted_at IS NULL;
