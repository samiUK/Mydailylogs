-- Create organizations from existing profiles that have organization_id as text
-- This handles the case where organization_id contains organization names directly

-- First, let's see what we're working with
DO $$
BEGIN
    -- Check if there are any profiles with organization_id values
    IF EXISTS (SELECT 1 FROM profiles WHERE organization_id IS NOT NULL) THEN
        -- Create organizations from unique organization_id values in profiles
        -- Assuming organization_id contains organization names
        INSERT INTO organizations (id, name, slug, created_at, updated_at)
        SELECT 
            gen_random_uuid() as id,
            COALESCE(NULLIF(organization_id::text, ''), 'Default Organization') as name,
            COALESCE(
                NULLIF(
                    regexp_replace(
                        lower(organization_id::text), 
                        '[^a-z0-9]+', '-', 'g'
                    ), 
                    ''
                ), 
                'default-organization'
            ) as slug,
            now() as created_at,
            now() as updated_at
        FROM (
            SELECT DISTINCT organization_id
            FROM profiles 
            WHERE organization_id IS NOT NULL 
            AND organization_id::text != ''
        ) unique_orgs
        ON CONFLICT (slug) DO NOTHING;

        -- Update profiles to reference the correct organization UUIDs
        UPDATE profiles 
        SET organization_id = orgs.id
        FROM organizations orgs
        WHERE profiles.organization_id::text = orgs.name
        AND profiles.organization_id IS NOT NULL;

        RAISE NOTICE 'Organizations created and profiles updated successfully';
    ELSE
        -- Create a default organization if no profiles exist
        INSERT INTO organizations (name, slug) 
        VALUES ('Default Organization', 'default-organization')
        ON CONFLICT (slug) DO NOTHING;
        
        RAISE NOTICE 'Default organization created';
    END IF;
END $$;

-- Verify the results
SELECT 'Organizations created:' as info, count(*) as count FROM organizations;
SELECT 'Profiles with organization_id:' as info, count(*) as count FROM profiles WHERE organization_id IS NOT NULL;
