-- Ensure only one active subscription per organization
-- This script identifies and removes duplicate subscriptions, keeping only the newest one

DO $$
DECLARE
  org_record RECORD;
  keep_sub_id uuid;
  deleted_count integer := 0;
BEGIN
  -- Log start
  RAISE NOTICE 'Starting subscription deduplication...';

  -- For each organization with multiple subscriptions
  FOR org_record IN 
    SELECT organization_id, COUNT(*) as sub_count
    FROM subscriptions
    GROUP BY organization_id
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE 'Organization % has % subscriptions', org_record.organization_id, org_record.sub_count;
    
    -- Keep the most recent subscription (by created_at)
    SELECT id INTO keep_sub_id
    FROM subscriptions
    WHERE organization_id = org_record.organization_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Delete all other subscriptions for this organization
    DELETE FROM subscriptions
    WHERE organization_id = org_record.organization_id
      AND id != keep_sub_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % duplicate subscriptions for organization %', deleted_count, org_record.organization_id;
  END LOOP;

  RAISE NOTICE 'Subscription deduplication complete';
END $$;

-- Add a unique constraint to prevent future duplicates
-- Note: This will only allow one subscription per organization
-- If you need to support multiple subscriptions (e.g., for different products),
-- modify the constraint accordingly

-- First, check if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subscriptions_organization_id_unique'
  ) THEN
    ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_organization_id_unique
    UNIQUE (organization_id);
    
    RAISE NOTICE 'Added unique constraint on subscriptions.organization_id';
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
END $$;

-- Special check for arsami.uk@gmail.com
DO $$
DECLARE
  arsami_org_id uuid;
  arsami_sub RECORD;
BEGIN
  -- Find arsami's organization
  SELECT organization_id INTO arsami_org_id
  FROM profiles
  WHERE email = 'arsami.uk@gmail.com'
  LIMIT 1;
  
  IF arsami_org_id IS NOT NULL THEN
    RAISE NOTICE 'Found organization for arsami.uk@gmail.com: %', arsami_org_id;
    
    -- Show subscription details
    FOR arsami_sub IN 
      SELECT id, plan_name, status, stripe_subscription_id, created_at
      FROM subscriptions
      WHERE organization_id = arsami_org_id
    LOOP
      RAISE NOTICE 'Subscription: id=%, plan=%, status=%, stripe_id=%, created=%', 
        arsami_sub.id, arsami_sub.plan_name, arsami_sub.status, 
        arsami_sub.stripe_subscription_id, arsami_sub.created_at;
    END LOOP;
  ELSE
    RAISE NOTICE 'Could not find organization for arsami.uk@gmail.com';
  END IF;
END $$;
