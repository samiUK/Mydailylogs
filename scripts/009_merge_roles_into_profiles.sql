-- Add role column to profiles table and migrate data from user_roles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'staff';

-- Update the role for the admin user
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'coolsami_uk@yahoo.com';

-- If no profile exists for the admin email, we'll let the trigger create it
-- The trigger will need to be updated to handle the role assignment

-- Drop the user_roles table since we're merging it into profiles
DROP TABLE IF EXISTS public.user_roles;

-- Update the trigger function to set admin role for specific email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  org_id uuid;
  user_role text := 'staff'; -- default role
BEGIN
  -- Set admin role for specific email
  IF NEW.email = 'coolsami_uk@yahoo.com' THEN
    user_role := 'admin';
  END IF;

  -- Create organization for admin users
  IF user_role = 'admin' THEN
    INSERT INTO public.organizations (name, slug)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization'),
      COALESCE(NEW.raw_user_meta_data->>'organization_slug', 'my-org')
    )
    RETURNING id INTO org_id;
  ELSE
    -- For staff users, we'll need to assign them to an existing organization
    -- For now, we'll leave organization_id as null and handle assignment later
    org_id := null;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (
    id,
    organization_id,
    first_name,
    last_name,
    full_name,
    email,
    role
  )
  VALUES (
    NEW.id,
    org_id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'first_name' || ' ' || NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    user_role
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
