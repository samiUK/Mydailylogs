-- Allow multiple profiles per email address for users with different roles
-- Remove any unique constraint on email if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

-- Add a unique constraint on email + role combination to prevent duplicate role assignments
ALTER TABLE profiles ADD CONSTRAINT profiles_email_role_unique UNIQUE (email, role);

-- Create an index for faster lookups by email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Update RLS policies to handle multiple profiles per email
-- Drop existing policies
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

-- Create new policies that allow users to access profiles with their email
CREATE POLICY "profiles_select_by_email"
  ON profiles FOR SELECT
  USING (
    auth.jwt() ->> 'email' = email OR 
    auth.uid() = id
  );

CREATE POLICY "profiles_insert_by_email"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' = email OR 
    auth.uid() = id
  );

CREATE POLICY "profiles_update_by_email"
  ON profiles FOR UPDATE
  USING (
    auth.jwt() ->> 'email' = email OR 
    auth.uid() = id
  );

CREATE POLICY "profiles_delete_by_email"
  ON profiles FOR DELETE
  USING (
    auth.jwt() ->> 'email' = email OR 
    auth.uid() = id
  );
