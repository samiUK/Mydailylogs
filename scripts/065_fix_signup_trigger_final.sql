-- Final fix for signup trigger with correct schema
-- The organizations table uses 'organization_id' as primary key, not 'id'

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create corrected trigger function with proper schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_org_slug text;
BEGIN
  -- Generate organization slug
  v_org_slug := COALESCE(
    new.raw_user_meta_data ->> 'organization_slug', 
    'my-org-' || SUBSTR(new.id::text, 1, 8)
  );

  -- Create organization first if it doesn't exist
  INSERT INTO public.organizations (
    organization_name, 
    slug, 
    logo_url
  )
  VALUES (
    COALESCE(new.raw_user_meta_data ->> 'organization_name', 'My Organization'),
    v_org_slug,
    '/placeholder.svg?height=50&width=50'
  )
  ON CONFLICT (slug) DO UPDATE 
  SET slug = EXCLUDED.slug
  RETURNING organization_id INTO v_org_id;

  -- If organization already existed, get its ID
  IF v_org_id IS NULL THEN
    SELECT organization_id INTO v_org_id
    FROM public.organizations
    WHERE slug = v_org_slug;
  END IF;

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
    v_org_id,
    COALESCE(new.raw_user_meta_data ->> 'first_name', SPLIT_PART(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data ->> 'last_name', ''),
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
  SELECT
    v_org_id,
    'Starter',
    'active',
    (NOW() + INTERVAL '100 years')::timestamptz
  WHERE NOT EXISTS (
    SELECT 1 FROM public.subscriptions WHERE organization_id = v_org_id
  );

  RETURN new;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
