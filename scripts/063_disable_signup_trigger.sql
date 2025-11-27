-- Disable the problematic database trigger that's causing signup failures
-- The trigger tries to create organizations/profiles but conflicts with manual creation

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Profiles will be created manually in the signup API route
-- This prevents database errors during user creation
