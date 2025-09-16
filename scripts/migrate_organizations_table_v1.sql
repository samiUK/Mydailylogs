-- Migrate organizations table to match profiles table structure
-- Rename columns and populate with data from profiles table

-- Step 1: Rename columns in organizations table
ALTER TABLE organizations RENAME COLUMN id TO organization_id;
ALTER TABLE organizations RENAME COLUMN name TO organization_name;

-- Step 2: Insert unique organizations from profiles table
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
GROUP BY p.organization_id, p.organization_name;

-- Step 3: Create function to auto-populate organizations when new profiles are created
CREATE OR REPLACE FUNCTION sync_organization_from_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert organization if it doesn't exist
    INSERT INTO organizations (organization_id, organization_name, created_at, updated_at)
    VALUES (NEW.organization_id, NEW.organization_name, NOW(), NOW())
    ON CONFLICT (organization_id) DO UPDATE SET
        organization_name = NEW.organization_name,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to automatically sync organizations
DROP TRIGGER IF EXISTS sync_organization_trigger ON profiles;
CREATE TRIGGER sync_organization_trigger
    AFTER INSERT OR UPDATE OF organization_id, organization_name ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_organization_from_profile();
