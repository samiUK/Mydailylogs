-- Recreate organizations table with data from profiles and build admin/staff hierarchy
-- First, let's see what organization_id values exist in profiles
SELECT DISTINCT organization_id, COUNT(*) as user_count 
FROM profiles 
WHERE organization_id IS NOT NULL 
GROUP BY organization_id;

-- Clear existing organizations table
DELETE FROM organizations;

-- Insert organizations based on unique organization_id values from profiles
-- Assuming organization_id contains organization names
INSERT INTO organizations (id, name, slug, created_at, updated_at)
SELECT 
    gen_random_uuid() as id,
    organization_id as name,
    LOWER(REPLACE(organization_id, ' ', '-')) as slug,
    NOW() as created_at,
    NOW() as updated_at
FROM (
    SELECT DISTINCT organization_id
    FROM profiles 
    WHERE organization_id IS NOT NULL 
    AND organization_id != ''
) unique_orgs;

-- Update profiles to reference the new organization UUIDs
-- This creates the proper foreign key relationship
UPDATE profiles 
SET organization_id = orgs.id
FROM organizations orgs
WHERE profiles.organization_id = orgs.name;

-- Show the hierarchy: organizations with their admin and staff members
SELECT 
    o.name as organization_name,
    p.full_name,
    p.email,
    p.role,
    p.position,
    CASE 
        WHEN p.reports_to IS NULL THEN 'Top Level'
        ELSE 'Reports to someone'
    END as hierarchy_level
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
ORDER BY o.name, p.role DESC, p.full_name;
