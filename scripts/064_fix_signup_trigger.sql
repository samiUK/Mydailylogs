-- Fix the trigger to use correct column names
-- This replaces the broken trigger that was causing signup errors

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create corrected trigger function with proper column names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create organization first if it doesn't exist
  INSERT INTO public.organizations (organization_name, slug, logo_url)
  VALUES (
    COALESCE(new.raw_user_meta_data ->> 'organization_name', 'My Organization'),
    COALESCE(new.raw_user_meta_data ->> 'organization_slug', 'my-org-' || SUBSTR(new.id::text, 1, 8)),
    '/placeholder.svg?height=50&width=50'
  )
  ON CONFLICT (slug) DO NOTHING;

  -- Create profile linked to the organization
  INSERT INTO public.profiles (
    id, 
    organization_id, 
    first_name,
    last_name,
    full_name, 
    role, 
    email
  )
  VALUES (
    new.id,
    (SELECT id FROM public.organizations WHERE slug = COALESCE(new.raw_user_meta_data ->> 'organization_slug', 'my-org-' || SUBSTR(new.id::text, 1, 8))),
    COALESCE(new.raw_user_meta_data ->> 'first_name', SPLIT_PART(SPLIT_PART(new.email, '@', 1), '.', 1)),
    COALESCE(new.raw_user_meta_data ->> 'last_name', SPLIT_PART(SPLIT_PART(new.email, '@', 1), '.', 2)),
    COALESCE(new.raw_user_meta_data ->> 'full_name', SPLIT_PART(new.email, '@', 1)),
    'admin',
    new.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create a free Starter subscription for the new organization
  INSERT INTO public.subscriptions (
    organization_id,
    plan_name,
    status,
    current_period_end
  )
  VALUES (
    (SELECT id FROM public.organizations WHERE slug = COALESCE(new.raw_user_meta_data ->> 'organization_slug', 'my-org-' || SUBSTR(new.id::text, 1, 8))),
    'Starter',
    'active',
    (NOW() + INTERVAL '100 years')::timestamptz
  )
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
