-- Add last_report_email_sent timestamp to organizations table
-- This helps track when report emails were last sent for each organization

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS last_report_email_sent TIMESTAMP WITH TIME ZONE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_last_report_email 
ON organizations(last_report_email_sent);

-- Add comment for clarity
COMMENT ON COLUMN organizations.last_report_email_sent IS 'Timestamp of when report summary email was last sent to admins/managers';
