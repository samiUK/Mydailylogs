-- Create organizations from existing profile data and sync organization names
-- First, create organizations from unique organization names in profiles
INSERT INTO organizations (id, name, slug, created_at, updated_at)
SELECT 
    gen_random_uuid() as id,
    COALESCE(organization_name, 'Default Organization') as name,
    LOWER(REPLACE(COALESCE(organization_name, 'default-organization'), ' ', '-')) as slug,
    NOW() as created_at,
    NOW() as updated_at
FROM profiles 
WHERE organization_name IS NOT NULL 
  AND organization_name != ''
  AND organization_name NOT IN (SELECT name FROM organizations WHERE name IS NOT NULL)
GROUP BY organization_name;

-- Update profiles to link to the correct organization_id
UPDATE profiles 
SET organization_id = organizations.id
FROM organizations 
WHERE profiles.organization_name = organizations.name
  AND profiles.organization_id IS NULL;

-- Create a default organization for profiles without organization names
INSERT INTO organizations (id, name, slug, created_at, updated_at)
SELECT gen_random_uuid(), 'Default Organization', 'default-organization', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'Default Organization');

-- Link profiles without organization names to the default organization
UPDATE profiles 
SET 
    organization_id = (SELECT id FROM organizations WHERE name = 'Default Organization' LIMIT 1),
    organization_name = 'Default Organization'
WHERE organization_name IS NULL OR organization_name = '';

-- Verify the results
SELECT 'Organizations created:' as info, COUNT(*) as count FROM organizations;
SELECT 'Profiles with organization_id:' as info, COUNT(*) as count FROM profiles WHERE organization_id IS NOT NULL;
SELECT 'Sample organizations:' as info, name, slug FROM organizations LIMIT 5;
