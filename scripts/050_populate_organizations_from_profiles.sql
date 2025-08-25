-- Create organizations from existing profile data and link users properly
-- This script extracts unique organization names from profiles and creates proper organization records

-- First, let's see what organization_id values exist in profiles
DO $$
DECLARE
    org_record RECORD;
    new_org_id UUID;
BEGIN
    -- Create organizations from unique organization_id values in profiles
    -- Assuming organization_id currently contains organization names as text
    FOR org_record IN 
        SELECT DISTINCT 
            COALESCE(organization_id::text, 'Default Organization') as org_name,
            COUNT(*) as user_count
        FROM profiles 
        WHERE organization_id IS NOT NULL
        GROUP BY organization_id
    LOOP
        -- Generate a new UUID for this organization
        new_org_id := gen_random_uuid();
        
        -- Insert the organization
        INSERT INTO organizations (id, name, slug, created_at, updated_at)
        VALUES (
            new_org_id,
            org_record.org_name,
            lower(replace(replace(org_record.org_name, ' ', '-'), '.', '-')),
            NOW(),
            NOW()
        )
        ON CONFLICT (name) DO NOTHING;
        
        -- Get the actual organization ID (in case of conflict)
        SELECT id INTO new_org_id FROM organizations WHERE name = org_record.org_name;
        
        -- Update profiles to use the proper organization UUID
        UPDATE profiles 
        SET organization_id = new_org_id
        WHERE organization_id::text = org_record.org_name;
        
        RAISE NOTICE 'Created organization: % with % users', org_record.org_name, org_record.user_count;
    END LOOP;
    
    -- Handle profiles with NULL organization_id
    IF EXISTS (SELECT 1 FROM profiles WHERE organization_id IS NULL) THEN
        -- Create a default organization for users without one
        new_org_id := gen_random_uuid();
        INSERT INTO organizations (id, name, slug, created_at, updated_at)
        VALUES (
            new_org_id,
            'Default Organization',
            'default-organization',
            NOW(),
            NOW()
        )
        ON CONFLICT (name) DO NOTHING;
        
        -- Get the default organization ID
        SELECT id INTO new_org_id FROM organizations WHERE name = 'Default Organization';
        
        -- Update profiles without organization
        UPDATE profiles 
        SET organization_id = new_org_id
        WHERE organization_id IS NULL;
        
        RAISE NOTICE 'Assigned users without organization to Default Organization';
    END IF;
END $$;

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
