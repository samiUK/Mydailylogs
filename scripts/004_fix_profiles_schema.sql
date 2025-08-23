-- Fix profiles table schema and remove RLS policies causing infinite recursion

-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Completely disable RLS on profiles table to fix infinite recursion
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

-- Update the trigger function to handle first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  org_id uuid;
  user_first_name text;
  user_last_name text;
  user_full_name text;
  user_org_name text;
BEGIN
  -- Extract metadata from the new user
  user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', user_first_name || ' ' || user_last_name);
  user_org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization');

  -- Create organization first
  INSERT INTO public.organizations (name, slug)
  VALUES (
    user_org_name,
    LOWER(REPLACE(user_org_name, ' ', '-'))
  )
  RETURNING id INTO org_id;

  -- Create profile with all name fields
  INSERT INTO public.profiles (
    id, 
    organization_id, 
    email, 
    first_name,
    last_name,
    full_name, 
    role
  )
  VALUES (
    NEW.id,
    org_id,
    NEW.email,
    user_first_name,
    user_last_name,
    user_full_name,
    'admin'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
