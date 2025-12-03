-- Add column to track when submission quota was last reset for free users
-- This helps handle upgrades/downgrades properly

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS last_submission_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing organizations to use their created_at as initial reset date
UPDATE organizations 
SET last_submission_reset_at = created_at 
WHERE last_submission_reset_at IS NULL;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_organizations_last_submission_reset 
ON organizations(last_submission_reset_at);

COMMENT ON COLUMN organizations.last_submission_reset_at IS 'Tracks when the monthly submission quota was last reset (for free tier users). Resets every 30 days from this date, or immediately on plan upgrade.';
