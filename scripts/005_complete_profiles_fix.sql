-- Complete fix for profiles table issues
-- This script addresses RLS infinite recursion and missing columns

-- First, completely disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on profiles table to eliminate infinite recursion
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_org" ON public.profiles;

-- Add missing first_name and last_name columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
        ALTER TABLE public.profiles ADD COLUMN first_name text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
        ALTER TABLE public.profiles ADD COLUMN last_name text;
    END IF;
END $$;

-- Update the trigger function to handle new name fields
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
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), ' ', 1));
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2));
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', user_first_name || ' ' || user_last_name);
    user_org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', user_first_name || '''s Organization');

    -- Create organization first
    INSERT INTO public.organizations (
        id,
        name,
        slug,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        user_org_name,
        lower(replace(user_org_name, ' ', '-')),
        NOW(),
        NOW()
    ) RETURNING id INTO org_id;

    -- Create user profile
    INSERT INTO public.profiles (
        id,
        organization_id,
        first_name,
        last_name,
        full_name,
        email,
        role,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        org_id,
        user_first_name,
        user_last_name,
        user_full_name,
        NEW.email,
        'admin', -- All signups are admin since only admins can create accounts
        NOW(),
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO anon;
