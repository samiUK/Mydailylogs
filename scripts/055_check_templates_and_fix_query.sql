-- Check if templates still exist in the database
SELECT 
    COUNT(*) as total_templates,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_templates,
    organization_id
FROM checklist_templates 
GROUP BY organization_id
ORDER BY organization_id;

-- Check specific organization templates
SELECT 
    id,
    name,
    description,
    organization_id,
    created_by,
    is_active,
    created_at
FROM checklist_templates 
WHERE organization_id = 'ffb2e473-6e00-4f06-aa8c-a948fb0dcb84'
ORDER BY created_at DESC;

-- Check if the foreign key relationship exists
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='checklist_templates'
    AND kcu.column_name='created_by';

-- Check RLS policies on checklist_templates
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'checklist_templates';
