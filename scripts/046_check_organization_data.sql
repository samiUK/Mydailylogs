-- Check what's currently in the organization_id field of profiles table
-- and see if we need to restructure the organization data

-- First, let's see what organization_id values exist in profiles
SELECT 
    organization_id,
    COUNT(*) as user_count,
    STRING_AGG(DISTINCT email, ', ') as sample_emails
FROM profiles 
WHERE organization_id IS NOT NULL
GROUP BY organization_id
ORDER BY user_count DESC;

-- Check if there are any records in the organizations table
SELECT COUNT(*) as org_count FROM organizations;

-- If organization_id contains organization names instead of UUIDs,
-- we need to create organizations and update the references
-- Let's check the data type and sample values
SELECT 
    organization_id,
    email,
    full_name,
    role
FROM profiles 
WHERE organization_id IS NOT NULL
LIMIT 10;

-- Check if organization_id looks like UUIDs or names
SELECT 
    organization_id,
    CASE 
        WHEN organization_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN 'UUID format'
        ELSE 'Not UUID - likely organization name'
    END as id_type,
    COUNT(*) as count
FROM profiles 
WHERE organization_id IS NOT NULL
GROUP BY organization_id, id_type
ORDER BY count DESC;
