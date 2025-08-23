-- Disable the problematic database trigger that's causing 500 errors during user creation
-- This trigger was causing permission issues when creating users via admin API

-- Drop the trigger that automatically creates profiles on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the trigger function as well
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Note: Profile creation is now handled manually in the API route
-- This prevents the 500 "unexpected_failure" errors that were occurring
-- due to the trigger trying to access tables outside the auth schema
