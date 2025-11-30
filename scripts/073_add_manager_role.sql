-- Add manager role to profiles table
-- Managers have same permissions as admins except they cannot remove admins

ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'manager', 'staff'));

COMMENT ON COLUMN public.profiles.role IS 'admin: full admin access including removing other admins. manager: admin-level access but cannot remove admins. staff: regular user access';

-- Update subscription products to reflect new structure
-- Growth: 1 admin + 2 managers = 3 total
-- Scale: 1 admin + 6 managers = 7 total
