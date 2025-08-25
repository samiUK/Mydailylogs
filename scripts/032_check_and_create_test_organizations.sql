-- Check existing organizations and create test data if needed
-- This script helps debug why the master dashboard shows 0 organizations

-- First, let's see what organizations exist
SELECT 'Current organizations:' as info;
SELECT id, name, slug, created_at FROM organizations ORDER BY created_at DESC;

-- Check profiles and their organization links
SELECT 'Profiles with organization links:' as info;
SELECT p.id, p.email, p.full_name, p.role, o.name as organization_name, o.slug
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
ORDER BY p.created_at DESC;

-- If no organizations exist, create some test data
-- This should match the existing users who signed up
INSERT INTO organizations (name, slug) 
SELECT 'Test Organization ' || generate_series(1, 3), 'test-org-' || generate_series(1, 3)
WHERE NOT EXISTS (SELECT 1 FROM organizations)
ON CONFLICT (slug) DO NOTHING;

-- Update any profiles without organization_id to link to the first organization
UPDATE profiles 
SET organization_id = (SELECT id FROM organizations LIMIT 1)
WHERE organization_id IS NULL 
AND EXISTS (SELECT 1 FROM organizations);

-- Show final state
SELECT 'Final organization count:' as info;
SELECT COUNT(*) as total_organizations FROM organizations;

SELECT 'Final profile-organization links:' as info;
SELECT COUNT(*) as profiles_with_orgs FROM profiles WHERE organization_id IS NOT NULL;
