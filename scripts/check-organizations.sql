-- Check current organizations in the database
SELECT organization_id, organization_name, slug, created_at, updated_at 
FROM organizations 
ORDER BY updated_at DESC;
