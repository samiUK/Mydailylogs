-- Check all organizations in the database
SELECT organization_id, organization_name, slug, created_at 
FROM organizations 
ORDER BY organization_name;

-- Check if there are multiple entries with the same name
SELECT organization_name, COUNT(*) as count
FROM organizations 
GROUP BY organization_name
HAVING COUNT(*) > 1;

-- Check the specific organization being updated
SELECT organization_id, organization_name, slug
FROM organizations 
WHERE organization_id = 'adbcbc2a-6f71-4b1e-a413-e47a8cc9b254';
