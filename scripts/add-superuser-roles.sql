-- Add role column to superusers table to differentiate between masteradmin and support
ALTER TABLE superusers 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'support' CHECK (role IN ('masteradmin', 'support'));

-- Update existing superusers to masteradmin (assuming they are the main admin)
UPDATE superusers 
SET role = 'masteradmin' 
WHERE role IS NULL;

-- Add comment to explain the roles
COMMENT ON COLUMN superusers.role IS 'masteradmin: full access including superuser management. support: can view and help users but cannot manage superusers';
