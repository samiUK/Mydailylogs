-- Fix subscription and profile relationships to ensure subscriptions are never missing
-- This script ensures proper foreign key relationships between profiles, organizations, and subscriptions

-- Step 1: Fix organizations table primary key (it should use organization_id, not id)
-- Check if the organizations table is using the correct primary key
DO $$
BEGIN
  -- Drop old foreign key constraints that reference organizations(id)
  ALTER TABLE IF EXISTS public.subscriptions 
    DROP CONSTRAINT IF EXISTS subscriptions_organization_id_fkey;
  
  ALTER TABLE IF EXISTS public.profiles 
    DROP CONSTRAINT IF EXISTS profiles_organization_id_fkey;
    
  -- Add the correct foreign key constraints referencing organizations(organization_id)
  ALTER TABLE public.subscriptions 
    ADD CONSTRAINT subscriptions_organization_id_fkey 
    FOREIGN KEY (organization_id) 
    REFERENCES public.organizations(organization_id) 
    ON DELETE CASCADE;
    
  ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_organization_id_fkey 
    FOREIGN KEY (organization_id) 
    REFERENCES public.organizations(organization_id) 
    ON DELETE CASCADE;
END $$;

-- Step 2: Ensure all plan_name values match the current enum constraint
-- Update the CHECK constraint to include all plan names (starter, growth, scale, free)
ALTER TABLE public.subscriptions 
  DROP CONSTRAINT IF EXISTS subscriptions_plan_name_check;

ALTER TABLE public.subscriptions 
  ADD CONSTRAINT subscriptions_plan_name_check 
  CHECK (plan_name IN ('starter', 'growth', 'scale', 'free'));

-- Step 3: Ensure every organization has a subscription
-- Create a function to auto-create a starter subscription for new organizations
CREATE OR REPLACE FUNCTION ensure_organization_has_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if organization already has a subscription
  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE organization_id = NEW.organization_id
  ) THEN
    -- Create a starter subscription for the organization
    INSERT INTO public.subscriptions (
      organization_id,
      plan_name,
      status,
      current_period_start,
      current_period_end,
      created_at,
      updated_at
    ) VALUES (
      NEW.organization_id,
      'starter',
      'active',
      NOW(),
      NOW() + INTERVAL '30 years', -- Starter is perpetual
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create subscription when a new profile is created
DROP TRIGGER IF EXISTS ensure_subscription_on_profile_insert ON public.profiles;
CREATE TRIGGER ensure_subscription_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_organization_has_subscription();

-- Step 4: Ensure every organization has a subscription when organization is created
CREATE OR REPLACE FUNCTION ensure_organization_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a starter subscription for new organizations
  INSERT INTO public.subscriptions (
    organization_id,
    plan_name,
    status,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
  ) VALUES (
    NEW.organization_id,
    'starter',
    'active',
    NOW(),
    NOW() + INTERVAL '30 years',
    NOW(),
    NOW()
  )
  ON CONFLICT (organization_id) 
  WHERE status IN ('active', 'trialing') 
  DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_subscription_on_org_insert ON public.organizations;
CREATE TRIGGER ensure_subscription_on_org_insert
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION ensure_organization_subscription();

-- Step 5: Backfill missing subscriptions for existing organizations
INSERT INTO public.subscriptions (
  organization_id,
  plan_name,
  status,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
)
SELECT 
  o.organization_id,
  'starter',
  'active',
  NOW(),
  NOW() + INTERVAL '30 years',
  NOW(),
  NOW()
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s 
  WHERE s.organization_id = o.organization_id
);

-- Step 6: Create a view to easily join profiles with their subscription
CREATE OR REPLACE VIEW user_subscriptions AS
SELECT 
  p.id as user_id,
  p.email,
  p.full_name,
  p.role,
  p.organization_id,
  o.organization_name,
  s.id as subscription_id,
  s.plan_name,
  s.status as subscription_status,
  s.current_period_start,
  s.current_period_end,
  s.stripe_subscription_id,
  s.stripe_customer_id,
  s.is_trial,
  s.trial_ends_at,
  s.cancel_at_period_end
FROM public.profiles p
JOIN public.organizations o ON p.organization_id = o.organization_id
LEFT JOIN public.subscriptions s ON o.organization_id = s.organization_id
  AND s.status IN ('active', 'trialing', 'past_due');

-- Grant access to the view
GRANT SELECT ON user_subscriptions TO authenticated;

-- Step 7: Add helpful indexes for subscription queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_status 
  ON public.subscriptions(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_profiles_org_email 
  ON public.profiles(organization_id, email);

-- Step 8: Create a function to get user's subscription safely
CREATE OR REPLACE FUNCTION get_user_subscription(user_id_param UUID)
RETURNS TABLE (
  subscription_id UUID,
  organization_id UUID,
  plan_name TEXT,
  status TEXT,
  stripe_subscription_id TEXT,
  is_trial BOOLEAN,
  trial_ends_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.organization_id,
    s.plan_name,
    s.status,
    s.stripe_subscription_id,
    s.is_trial,
    s.trial_ends_at
  FROM public.profiles p
  JOIN public.subscriptions s ON p.organization_id = s.organization_id
  WHERE p.id = user_id_param
    AND s.status IN ('active', 'trialing', 'past_due')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_subscription(UUID) TO authenticated;
