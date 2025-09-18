-- Disable the automatic organization sync trigger that overrides manual changes
-- This trigger was causing manual organization name changes to be reverted

-- Drop the existing trigger
DROP TRIGGER IF EXISTS sync_organization_trigger ON profiles;

-- Drop the function as well since we don't want automatic overrides
DROP FUNCTION IF EXISTS sync_organization_from_profile();

-- Add a comment explaining why this was removed
COMMENT ON TABLE organizations IS 'Organization names can be manually updated from masterdashboard. Sync operations will respect recent manual changes and not override them.';
