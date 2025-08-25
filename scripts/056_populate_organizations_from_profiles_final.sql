-- Create organizations from existing profile data and ensure consistency across all modes
-- This script extracts unique organization names from profiles and creates proper organization records

-- First, let's see what organization names exist in profiles
SELECT DISTINCT organization_name, COUNT(*) as user_count 
FROM profiles 
WHERE organization_name IS NOT NULL AND organization_name != '' 
GROUP BY organization_name;

-- Create organizations from unique organization names in profiles
INSERT INTO organizations (id, name, slug, created_at, updated_at)
SELECT 
    gen_random_uuid() as id,
    COALESCE(organization_name, 'Default Organization') as name,
    LOWER(REPLACE(COALESCE(organization_name, 'default-organization'), ' ', '-')) as slug,
    NOW() as created_at,
    NOW() as updated_at
FROM (
    SELECT DISTINCT organization_name
    FROM profiles 
    WHERE organization_name IS NOT NULL AND organization_name != ''
) unique_orgs
ON CONFLICT (name) DO NOTHING;

-- Update profiles to link to the correct organization_id
UPDATE profiles 
SET organization_id = organizations.id
FROM organizations 
WHERE profiles.organization_name = organizations.name
AND profiles.organization_id IS NULL;

-- Create a default organization for profiles without organization names
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Default Organization',
    'default-organization',
    NOW(),
    NOW()
) ON CONFLICT (name) DO NOTHING;

-- Link profiles without organization names to the default organization
UPDATE profiles 
SET 
    organization_id = (SELECT id FROM organizations WHERE name = 'Default Organization'),
    organization_name = 'Default Organization'
WHERE organization_name IS NULL OR organization_name = '';

-- Verify the results
SELECT 
    o.name as organization_name,
    COUNT(p.id) as user_count,
    COUNT(CASE WHEN p.role = 'admin' THEN 1 END) as admin_count,
    COUNT(CASE WHEN p.role = 'staff' THEN 1 END) as staff_count
FROM organizations o
LEFT JOIN profiles p ON o.id = p.organization_id
GROUP BY o.id, o.name
ORDER BY user_count DESC;

-- Show sample data
SELECT 'Organizations created:' as info;
SELECT id, name, slug FROM organizations LIMIT 5;

SELECT 'Sample profiles with organization links:' as info;
SELECT email, organization_name, role FROM profiles WHERE organization_id IS NOT NULL LIMIT 5;
