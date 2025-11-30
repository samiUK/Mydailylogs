-- Add contractor email tracking table
CREATE TABLE IF NOT EXISTS contractor_emails_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  contractor_email TEXT NOT NULL,
  contractor_name TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  billing_cycle_start TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_contractor_emails_org_cycle 
ON contractor_emails_sent(organization_id, billing_cycle_start);

-- Enable RLS
ALTER TABLE contractor_emails_sent ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their organization's email history
CREATE POLICY "Users can view contractor emails from their organization"
ON contractor_emails_sent FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Policy: System can insert email records
CREATE POLICY "System can insert contractor emails"
ON contractor_emails_sent FOR INSERT
WITH CHECK (true);
