-- Add missing columns to superusers table
ALTER TABLE superusers 
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'support' CHECK (role IN ('masteradmin', 'support')),
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Update existing superusers to have masteradmin role if they were created before this migration
UPDATE superusers 
SET role = 'masteradmin' 
WHERE role IS NULL AND created_at < NOW();

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_superusers_email ON superusers(email);
CREATE INDEX IF NOT EXISTS idx_superusers_is_active ON superusers(is_active);
