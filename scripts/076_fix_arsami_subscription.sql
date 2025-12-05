-- Fix arsami.uk@gmail.com subscription issue
-- This script will clean up and create the correct subscription

-- Step 1: Find the organization_id for arsami.uk@gmail.com
DO $$
DECLARE
  target_org_id uuid;
  target_user_id uuid;
BEGIN
  -- Get the organization and user ID
  SELECT organization_id, id INTO target_org_id, target_user_id
  FROM profiles
  WHERE email = 'arsami.uk@gmail.com';

  IF target_org_id IS NULL THEN
    RAISE NOTICE 'User arsami.uk@gmail.com not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found organization_id: %, user_id: %', target_org_id, target_user_id;

  -- Step 2: Show current subscriptions
  RAISE NOTICE 'Current subscriptions for this organization:';
  FOR rec IN 
    SELECT id, plan_name, status, stripe_subscription_id, created_at
    FROM subscriptions
    WHERE organization_id = target_org_id
    ORDER BY created_at DESC
  LOOP
    RAISE NOTICE '  - ID: %, Plan: %, Status: %, Stripe ID: %, Created: %', 
      rec.id, rec.plan_name, rec.status, rec.stripe_subscription_id, rec.created_at;
  END LOOP;

  -- Step 3: Delete all subscriptions except the most recent Stripe one
  DELETE FROM subscriptions
  WHERE organization_id = target_org_id
  AND id NOT IN (
    SELECT id FROM subscriptions
    WHERE organization_id = target_org_id
    AND stripe_subscription_id IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
  );

  RAISE NOTICE 'Cleaned up duplicate subscriptions';

  -- Step 4: Verify final state
  RAISE NOTICE 'Final subscription for this organization:';
  FOR rec IN 
    SELECT id, plan_name, status, stripe_subscription_id, created_at
    FROM subscriptions
    WHERE organization_id = target_org_id
  LOOP
    RAISE NOTICE '  - ID: %, Plan: %, Status: %, Stripe ID: %, Created: %', 
      rec.id, rec.plan_name, rec.status, rec.stripe_subscription_id, rec.created_at;
  END LOOP;

END $$;
