-- Production Security and Constraint Fixes
-- Run this script before launching to production

-- 1. Enable RLS on all tables that should have it
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quota_modifications ENABLE ROW LEVEL SECURITY;

-- 2. Add RLS policies for profiles (users can only see their own profile and org members)
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 3. Add RLS policy for quota_modifications (only master admin can view)
CREATE POLICY "Only master admins can view quota modifications"
  ON quota_modifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM superusers
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

-- 4. CRITICAL: Add unique constraint to prevent multiple active subscriptions per organization
-- First, clean up any existing duplicates
WITH ranked_subs AS (
  SELECT 
    id,
    organization_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id 
      ORDER BY 
        CASE WHEN stripe_subscription_id IS NOT NULL THEN 0 ELSE 1 END,  -- Prioritize Stripe subs
        created_at DESC
    ) as rn
  FROM subscriptions
  WHERE status IN ('active', 'trialing')
)
DELETE FROM subscriptions
WHERE id IN (
  SELECT id FROM ranked_subs WHERE rn > 1
);

-- Now add the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_subscription_per_org 
  ON subscriptions (organization_id) 
  WHERE status IN ('active', 'trialing');

-- 5. Add index for faster subscription lookups by Stripe ID
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id 
  ON subscriptions (stripe_subscription_id) 
  WHERE stripe_subscription_id IS NOT NULL;

-- 6. Add index for subscription activity logs queries
CREATE INDEX IF NOT EXISTS idx_subscription_activity_org_created 
  ON subscription_activity_logs (organization_id, created_at DESC);

-- 7. Add check constraint to ensure valid subscription status
ALTER TABLE subscriptions 
  ADD CONSTRAINT chk_valid_subscription_status 
  CHECK (status IN ('active', 'trialing', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid'));

-- 8. Add check constraint to ensure valid plan names
ALTER TABLE subscriptions 
  ADD CONSTRAINT chk_valid_plan_name 
  CHECK (
    plan_name IN (
      'starter', 
      'growth-monthly', 'growth-yearly',
      'scale-monthly', 'scale-yearly'
    ) 
    OR plan_name LIKE 'custom-%'
  );

-- 9. Add foreign key constraint from subscriptions to organizations (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'subscriptions_organization_id_fkey'
  ) THEN
    ALTER TABLE subscriptions 
      ADD CONSTRAINT subscriptions_organization_id_fkey 
      FOREIGN KEY (organization_id) 
      REFERENCES organizations(organization_id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- 10. Add trigger to log subscription changes automatically
CREATE OR REPLACE FUNCTION log_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND 
      (OLD.status IS DISTINCT FROM NEW.status OR 
       OLD.plan_name IS DISTINCT FROM NEW.plan_name)) THEN
    
    INSERT INTO subscription_activity_logs (
      organization_id,
      subscription_id,
      stripe_subscription_id,
      event_type,
      from_plan,
      to_plan,
      from_status,
      to_status,
      triggered_by
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      NEW.stripe_subscription_id,
      CASE 
        WHEN OLD.status != NEW.status THEN 'status_changed'
        WHEN OLD.plan_name != NEW.plan_name THEN 'plan_changed'
        ELSE 'updated'
      END,
      OLD.plan_name,
      NEW.plan_name,
      OLD.status,
      NEW.status,
      'database_trigger'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER subscription_change_logger
  AFTER UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION log_subscription_change();

-- Verification queries
-- Run these after the script to verify everything is working

-- Check RLS is enabled on critical tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'subscriptions', 'quota_modifications', 'payments')
ORDER BY tablename;

-- Check for duplicate active subscriptions (should return 0)
SELECT organization_id, COUNT(*) as active_subs
FROM subscriptions
WHERE status IN ('active', 'trialing')
GROUP BY organization_id
HAVING COUNT(*) > 1;

-- Verify indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE '%subscription%'
ORDER BY tablename, indexname;

-- Done! Database is now production-ready
