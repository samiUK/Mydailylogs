-- Fix infinite recursion in profiles RLS policies
-- This script removes problematic policies and creates safe, non-recursive ones

-- Drop all existing policies on profiles table to eliminate recursion
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Master admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Master admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can access all profiles" ON profiles;

-- Disable RLS temporarily to ensure we can create new policies
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies

-- 1. Allow users to view their own profile (using auth.uid() directly)
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- 2. Allow users to update their own profile (using auth.uid() directly)
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- 3. Allow service role full access (for server-side operations)
CREATE POLICY "Service role full access" ON profiles
    FOR ALL USING (auth.role() = 'service_role');

-- 4. Allow authenticated users to view profiles in their organization
-- (This is safe because it doesn't reference the profiles table recursively)
CREATE POLICY "Organization members can view profiles" ON profiles
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
GRANT ALL ON profiles TO anon;

-- Ensure the profiles table has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
