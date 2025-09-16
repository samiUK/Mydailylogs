-- Fix organizations table RLS policy to allow updates
-- This addresses the "new row violates row-level security policy" error

-- Add UPDATE policy for organizations table
CREATE POLICY "Users can update their organization" ON organizations
  FOR UPDATE USING (
    organization_id = get_user_organization_id() OR is_superuser()
  );

-- Also add INSERT policy in case new organizations need to be created
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization_id() OR is_superuser()
  );

-- Verify the policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'organizations'
ORDER BY policyname;
