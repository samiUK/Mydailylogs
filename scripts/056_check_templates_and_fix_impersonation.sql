-- Check what templates exist in the database
SELECT 
    ct.id,
    ct.name,
    ct.organization_id,
    o.name as organization_name,
    p.email as created_by_email
FROM checklist_templates ct
LEFT JOIN organizations o ON ct.organization_id = o.id
LEFT JOIN profiles p ON ct.created_by = p.id
ORDER BY ct.created_at DESC;

-- Check what organization coolsami_uk@yahoo.com belongs to
SELECT 
    p.id,
    p.email,
    p.organization_id,
    o.name as organization_name
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email = 'coolsami_uk@yahoo.com';

-- Check what organization mohamadhtc@gmail.com belongs to
SELECT 
    p.id,
    p.email,
    p.organization_id,
    o.name as organization_name
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email = 'mohamadhtc@gmail.com';
