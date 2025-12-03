-- Add retention policy settings to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS photo_retention_days INTEGER DEFAULT 365,
ADD COLUMN IF NOT EXISTS auto_cleanup_enabled BOOLEAN DEFAULT false;

-- Add index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_submitted_reports_created_at 
ON submitted_reports(created_at);

-- Comment
COMMENT ON COLUMN organizations.photo_retention_days IS 'Number of days to retain photos before automatic cleanup';
COMMENT ON COLUMN organizations.auto_cleanup_enabled IS 'Enable automatic deletion of old photos';
