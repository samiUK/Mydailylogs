-- Add address field to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_address ON organizations(address);

COMMENT ON COLUMN organizations.address IS 'Physical address of the organization shown in reports';
