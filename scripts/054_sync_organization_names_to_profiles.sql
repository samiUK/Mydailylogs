-- Create script to sync organization names from organizations table to profiles table
-- Update profiles.organization_name with the corresponding name from organizations table
UPDATE profiles 
SET organization_name = organizations.name
FROM organizations 
WHERE profiles.organization_id = organizations.id;

-- Verify the update by showing the synced data
SELECT 
    p.id,
    p.email,
    p.organization_id,
    p.organization_name as profile_org_name,
    o.name as organizations_table_name
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
ORDER BY p.email;

-- Show count of profiles updated
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN organization_name IS NOT NULL THEN 1 END) as profiles_with_org_name,
    COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END) as profiles_with_org_id
FROM profiles;
