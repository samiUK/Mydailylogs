-- EMERGENCY FIX: Disable RLS on profiles table to restore login functionality
-- This script completely disables Row Level Security on the profiles table
-- to allow users to login again while we investigate the policy issues

-- First, check if profiles data is intact
SELECT COUNT(*) as total_profiles FROM profiles;
SELECT email, role, created_at FROM profiles LIMIT 5;

-- Disable RLS completely on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies that are causing recursion
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Master admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Master admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- Test profile access
SELECT email, role FROM profiles WHERE email = 'coolsami_uk@yahoo.com';
