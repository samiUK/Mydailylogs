-- Clean up organization data to ensure uniqueness of organization_id and organization_name
-- This script will merge duplicate organizations and enforce uniqueness constraints

BEGIN;

-- Step 1: Add unique constraints to organizations table if they don't exist
DO $$ 
BEGIN
    -- Add unique constraint on organization_id (should already be primary key)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organizations_pkey' 
        AND table_name = 'organizations'
    ) THEN
        ALTER TABLE organizations ADD CONSTRAINT organizations_pkey PRIMARY KEY (organization_id);
    END IF;
    
    -- Add unique constraint on organization_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organizations_organization_name_unique' 
        AND table_name = 'organizations'
    ) THEN
        ALTER TABLE organizations ADD CONSTRAINT organizations_organization_name_unique UNIQUE (organization_name);
    END IF;
END $$;

-- Step 2: Find and merge duplicate organization names in profiles table
-- First, let's see what duplicates exist
CREATE TEMP TABLE organization_duplicates AS
SELECT 
    organization_name,
    COUNT(*) as count,
    array_agg(DISTINCT organization_id) as org_ids
FROM profiles 
WHERE organization_name IS NOT NULL 
GROUP BY organization_name 
HAVING COUNT(DISTINCT organization_id) > 1;

-- Step 3: For each duplicate organization name, keep the first organization_id and update others
DO $$
DECLARE
    dup_record RECORD;
    primary_org_id UUID;
    secondary_org_id UUID;
BEGIN
    FOR dup_record IN SELECT * FROM organization_duplicates LOOP
        -- Get the primary organization_id (first one)
        primary_org_id := dup_record.org_ids[1];
        
        -- Update all profiles with duplicate organization names to use the primary org_id
        FOR i IN 2..array_length(dup_record.org_ids, 1) LOOP
            secondary_org_id := dup_record.org_ids[i];
            
            -- Update profiles table
            UPDATE profiles 
            SET organization_id = primary_org_id 
            WHERE organization_id = secondary_org_id;
            
            -- Update all other tables that reference organization_id
            UPDATE checklist_templates SET organization_id = primary_org_id WHERE organization_id = secondary_org_id;
            UPDATE daily_checklists SET organization_id = primary_org_id WHERE organization_id = secondary_org_id;
            UPDATE external_submissions SET organization_id = primary_org_id WHERE organization_id = secondary_org_id;
            UPDATE feedback SET organization_id = primary_org_id WHERE organization_id = secondary_org_id;
            UPDATE holidays SET organization_id = primary_org_id WHERE organization_id = secondary_org_id;
            UPDATE staff_unavailability SET organization_id = primary_org_id WHERE organization_id = secondary_org_id;
            UPDATE submitted_reports SET organization_id = primary_org_id WHERE organization_id = secondary_org_id;
            UPDATE subscriptions SET organization_id = primary_org_id WHERE organization_id = secondary_org_id;
            UPDATE template_assignments SET organization_id = primary_org_id WHERE organization_id = secondary_org_id;
            UPDATE template_schedule_exclusions SET organization_id = primary_org_id WHERE organization_id = secondary_org_id;
            
            RAISE NOTICE 'Merged organization_id % into % for organization_name: %', 
                secondary_org_id, primary_org_id, dup_record.organization_name;
        END LOOP;
    END LOOP;
END $$;

-- Step 4: Populate organizations table with unique organizations from profiles
INSERT INTO organizations (organization_id, organization_name, created_at, updated_at)
SELECT DISTINCT 
    p.organization_id,
    p.organization_name,
    MIN(p.created_at) as created_at,
    NOW() as updated_at
FROM profiles p
WHERE p.organization_id IS NOT NULL 
    AND p.organization_name IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM organizations o 
        WHERE o.organization_id = p.organization_id
    )
GROUP BY p.organization_id, p.organization_name
ON CONFLICT (organization_id) DO UPDATE SET
    organization_name = EXCLUDED.organization_name,
    updated_at = NOW();

-- Step 5: Add foreign key constraints to ensure referential integrity
-- Note: We'll add these constraints to prevent future inconsistencies

-- Add foreign key constraint to profiles table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_organization_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraints to other tables
DO $$
BEGIN
    -- checklist_templates
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'checklist_templates_organization_id_fkey' 
        AND table_name = 'checklist_templates'
    ) THEN
        ALTER TABLE checklist_templates 
        ADD CONSTRAINT checklist_templates_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
    END IF;
    
    -- daily_checklists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'daily_checklists_organization_id_fkey' 
        AND table_name = 'daily_checklists'
    ) THEN
        ALTER TABLE daily_checklists 
        ADD CONSTRAINT daily_checklists_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
    END IF;
    
    -- Add similar constraints for other tables...
    -- (Adding a few key ones, can add more if needed)
    
    -- feedback
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'feedback_organization_id_fkey' 
        AND table_name = 'feedback'
    ) THEN
        ALTER TABLE feedback 
        ADD CONSTRAINT feedback_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
    END IF;
    
    -- subscriptions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscriptions_organization_id_fkey' 
        AND table_name = 'subscriptions'
    ) THEN
        ALTER TABLE subscriptions 
        ADD CONSTRAINT subscriptions_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 6: Create a function to automatically sync organization data
CREATE OR REPLACE FUNCTION sync_organization_from_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- When a profile is inserted or updated, ensure the organization exists
    IF NEW.organization_id IS NOT NULL AND NEW.organization_name IS NOT NULL THEN
        INSERT INTO organizations (organization_id, organization_name, created_at, updated_at)
        VALUES (NEW.organization_id, NEW.organization_name, NOW(), NOW())
        ON CONFLICT (organization_id) DO UPDATE SET
            organization_name = EXCLUDED.organization_name,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to automatically sync organization data
DROP TRIGGER IF EXISTS sync_organization_trigger ON profiles;
CREATE TRIGGER sync_organization_trigger
    AFTER INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_organization_from_profile();

-- Step 8: Clean up temporary table
DROP TABLE IF EXISTS organization_duplicates;

-- Step 9: Verify the cleanup
SELECT 
    'Organizations' as table_name,
    COUNT(*) as total_count,
    COUNT(DISTINCT organization_id) as unique_org_ids,
    COUNT(DISTINCT organization_name) as unique_org_names
FROM organizations
UNION ALL
SELECT 
    'Profiles' as table_name,
    COUNT(*) as total_count,
    COUNT(DISTINCT organization_id) as unique_org_ids,
    COUNT(DISTINCT organization_name) as unique_org_names
FROM profiles
WHERE organization_id IS NOT NULL;

COMMIT;

-- Final verification query
SELECT 
    o.organization_id,
    o.organization_name,
    COUNT(p.id) as profile_count
FROM organizations o
LEFT JOIN profiles p ON o.organization_id = p.organization_id
GROUP BY o.organization_id, o.organization_name
ORDER BY o.organization_name;
