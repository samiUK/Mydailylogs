-- Add address column to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN organizations.address IS 'Organization physical address that appears on reports';
