-- Create organizations from existing profile data
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
            COALESCE(NULLIF(organization_id::text, ''), 'Default Organization') as org_name
        FROM profiles 
        WHERE organization_id IS NOT NULL
    LOOP
        -- Generate a new UUID for this organization
        new_org_id := gen_random_uuid();
        
        -- Insert the organization
        INSERT INTO organizations (id, name, slug, created_at, updated_at)
        VALUES (
            new_org_id,
            org_record.org_name,
            lower(replace(replace(org_record.org_name, ' ', '-'), '''', '')),
            NOW(),
            NOW()
        )
        ON CONFLICT (name) DO NOTHING;
        
        RAISE NOTICE 'Created organization: %', org_record.org_name;
    END LOOP;
    
    -- Create a default organization if none exist
    IF NOT EXISTS (SELECT 1 FROM organizations) THEN
        INSERT INTO organizations (id, name, slug, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'MyDayLogs Default',
            'mydaylogs-default',
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Created default organization: MyDayLogs Default';
    END IF;
    
    -- Now update profiles to reference the correct organization UUIDs
    -- This assumes organization_id currently contains organization names
    UPDATE profiles 
    SET organization_id = (
        SELECT o.id 
        FROM organizations o 
        WHERE o.name = COALESCE(NULLIF(profiles.organization_id::text, ''), 'MyDayLogs Default')
        LIMIT 1
    )
    WHERE organization_id IS NOT NULL;
    
    RAISE NOTICE 'Updated profile organization references';
    
END $$;

-- Verify the results
SELECT 'Organizations created:' as info, COUNT(*) as count FROM organizations;
SELECT 'Profiles with organizations:' as info, COUNT(*) as count FROM profiles WHERE organization_id IS NOT NULL;

-- Show sample data
SELECT o.name as organization_name, COUNT(p.id) as user_count
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY user_count DESC;
