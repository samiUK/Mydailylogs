-- Add custom quota limit columns to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS custom_template_limit INTEGER,
ADD COLUMN IF NOT EXISTS custom_team_limit INTEGER,
ADD COLUMN IF NOT EXISTS custom_manager_limit INTEGER,
ADD COLUMN IF NOT EXISTS custom_monthly_submissions INTEGER;

-- Create audit table for quota modifications
CREATE TABLE IF NOT EXISTS quota_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  modified_by TEXT NOT NULL, -- email of master admin
  field_name TEXT NOT NULL, -- 'template_limit', 'team_limit', 'manager_limit', 'monthly_submissions'
  old_value INTEGER,
  new_value INTEGER,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quota_modifications_org ON quota_modifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_quota_modifications_created ON quota_modifications(created_at DESC);
