-- Add organization_name column to profiles table and populate it
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_name TEXT;

-- Update existing profiles with organization names from the organizations table
UPDATE profiles 
SET organization_name = organizations.name 
FROM organizations 
WHERE profiles.organization_id = organizations.id 
AND profiles.organization_name IS NULL;

-- Set a default organization name for profiles without an organization
UPDATE profiles 
SET organization_name = 'Default Organization' 
WHERE organization_name IS NULL;

-- Make organization_name NOT NULL after populating
ALTER TABLE profiles ALTER COLUMN organization_name SET NOT NULL;
