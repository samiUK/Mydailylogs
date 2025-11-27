-- Completely disable the problematic signup trigger
-- This allows us to handle user creation in application code instead

-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Confirm removal
SELECT 'Signup trigger successfully disabled' as status;
