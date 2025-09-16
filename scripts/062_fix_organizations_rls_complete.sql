-- Fix organizations table RLS policies completely
-- This addresses the "new row violates row-level security policy" error

-- First, check if we have the get_user_organization_id function
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT organization_id 
  FROM profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Check if user is superuser
CREATE OR REPLACE FUNCTION is_superuser()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM superusers 
    WHERE email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    ) AND is_active = true
  );
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Users can update their organization" ON organizations;
DROP POLICY IF EXISTS "Users can insert their organization" ON organizations;

-- Create comprehensive RLS policies for organizations table
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    organization_id = get_user_organization_id() OR is_superuser()
  );

CREATE POLICY "Users can update their organization" ON organizations
  FOR UPDATE USING (
    organization_id = get_user_organization_id() OR is_superuser()
  );

CREATE POLICY "Users can insert their organization" ON organizations
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization_id() OR is_superuser()
  );

-- Ensure RLS is enabled
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, UPDATE, INSERT ON organizations TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
