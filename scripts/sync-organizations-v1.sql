-- Create function to sync organizations from profiles table to all relevant tables
CREATE OR REPLACE FUNCTION sync_organizations_from_profiles()
RETURNS TABLE(
  action_type TEXT,
  organization_id UUID,
  organization_name TEXT,
  affected_tables TEXT[]
) AS $$
DECLARE
  profile_org RECORD;
  existing_org RECORD;
  tables_updated TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Loop through unique organization combinations in profiles table
  FOR profile_org IN 
    SELECT DISTINCT p.organization_id, p.organization_name
    FROM profiles p
    WHERE p.organization_id IS NOT NULL 
    AND p.organization_name IS NOT NULL
    AND p.organization_name != ''
  LOOP
    -- Check if organization exists in organizations table
    SELECT * INTO existing_org 
    FROM organizations o 
    WHERE o.organization_id = profile_org.organization_id;
    
    IF existing_org IS NULL THEN
      -- Insert new organization
      INSERT INTO organizations (organization_id, organization_name, created_at, updated_at)
      VALUES (profile_org.organization_id, profile_org.organization_name, NOW(), NOW());
      
      tables_updated := array_append(tables_updated, 'organizations');
      
      -- Return info about new organization
      action_type := 'CREATED';
      organization_id := profile_org.organization_id;
      organization_name := profile_org.organization_name;
      affected_tables := tables_updated;
      RETURN NEXT;
      
    ELSIF existing_org.organization_name != profile_org.organization_name THEN
      -- Update organization name if different
      UPDATE organizations 
      SET organization_name = profile_org.organization_name, updated_at = NOW()
      WHERE organization_id = profile_org.organization_id;
      
      tables_updated := array_append(tables_updated, 'organizations');
      
      -- Update organization_name in all other tables that have it
      UPDATE checklist_templates SET updated_at = NOW() WHERE organization_id = profile_org.organization_id;
      UPDATE daily_checklists SET updated_at = NOW() WHERE organization_id = profile_org.organization_id;
      UPDATE external_submissions SET updated_at = NOW() WHERE organization_id = profile_org.organization_id;
      UPDATE feedback SET updated_at = NOW() WHERE organization_id = profile_org.organization_id;
      UPDATE holidays SET updated_at = NOW() WHERE organization_id = profile_org.organization_id;
      UPDATE report_audit_logs SET organization_id = profile_org.organization_id WHERE organization_id = profile_org.organization_id;
      UPDATE report_backups SET updated_at = NOW() WHERE organization_id = profile_org.organization_id;
      UPDATE staff_unavailability SET updated_at = NOW() WHERE organization_id = profile_org.organization_id;
      UPDATE submitted_reports SET updated_at = NOW() WHERE organization_id = profile_org.organization_id;
      UPDATE subscriptions SET updated_at = NOW() WHERE organization_id = profile_org.organization_id;
      UPDATE template_assignments SET updated_at = NOW() WHERE organization_id = profile_org.organization_id;
      UPDATE template_schedule_exclusions SET updated_at = NOW() WHERE organization_id = profile_org.organization_id;
      
      tables_updated := array_append(tables_updated, 'all_related_tables');
      
      -- Return info about updated organization
      action_type := 'UPDATED';
      organization_id := profile_org.organization_id;
      organization_name := profile_org.organization_name;
      affected_tables := tables_updated;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Execute the sync function
SELECT * FROM sync_organizations_from_profiles();
