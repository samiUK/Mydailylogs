-- Unified Subscription System
-- This script ensures all subscription-related tables are properly linked
-- and that ONE subscription per organization is enforced at the database level

-- Step 1: Clean up any duplicate subscriptions
-- Keep only the most recent subscription per organization
WITH ranked_subs AS (
  SELECT 
    id,
    organization_id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id 
      ORDER BY 
        CASE WHEN stripe_subscription_id IS NOT NULL THEN 0 ELSE 1 END,
        created_at DESC
    ) as rn
  FROM subscriptions
)
DELETE FROM subscriptions
WHERE id IN (
  SELECT id FROM ranked_subs WHERE rn > 1
);

-- Step 2: Add unique constraint to prevent future duplicates
-- Drop existing constraint if it exists
ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS unique_active_subscription_per_org;

-- Add new unique constraint - only ONE active/trialing subscription per org
CREATE UNIQUE INDEX unique_active_subscription_per_org
ON subscriptions (organization_id)
WHERE status IN ('active', 'trialing');

-- Step 3: Ensure stripe_subscription_id is unique when present
CREATE UNIQUE INDEX unique_stripe_subscription_id
ON subscriptions (stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- Step 4: Add proper foreign key constraints
-- Fixed: Check if primary key exists first, don't use ON CONFLICT
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organizations_pkey'
  ) THEN
    ALTER TABLE organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (organization_id);
  END IF;
END $$;

-- Add foreign key from subscriptions to organizations
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_organization_id_fkey;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES organizations(organization_id)
ON DELETE CASCADE;

-- Add foreign key from payments to subscriptions
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_subscription_id_fkey;

ALTER TABLE payments
ADD CONSTRAINT payments_subscription_id_fkey
FOREIGN KEY (subscription_id)
REFERENCES subscriptions(id)
ON DELETE SET NULL;

-- Step 5: Add trigger to log subscription changes
CREATE OR REPLACE FUNCTION log_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD.plan_name IS DISTINCT FROM NEW.plan_name OR
    OLD.status IS DISTINCT FROM NEW.status
  ) THEN
    INSERT INTO subscription_activity_logs (
      subscription_id,
      organization_id,
      stripe_subscription_id,
      event_type,
      from_plan,
      to_plan,
      from_status,
      to_status,
      triggered_by,
      details
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      NEW.stripe_subscription_id,
      CASE 
        WHEN OLD.plan_name != NEW.plan_name THEN 'plan_change'
        WHEN OLD.status != NEW.status THEN 'status_change'
        ELSE 'update'
      END,
      OLD.plan_name,
      NEW.plan_name,
      OLD.status,
      NEW.status,
      'database_trigger',
      jsonb_build_object(
        'old_plan', OLD.plan_name,
        'new_plan', NEW.plan_name,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'timestamp', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscription_change_logger ON subscriptions;

CREATE TRIGGER subscription_change_logger
AFTER UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION log_subscription_change();

-- Step 6: Add indexes for faster subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_status 
ON subscriptions(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id 
ON subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_payments_subscription_id 
ON payments(subscription_id);

-- Step 7: Create a view for quick subscription lookups
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
  s.*,
  o.organization_name,
  o.custom_template_limit,
  o.custom_team_limit,
  o.custom_manager_limit,
  o.custom_monthly_submissions,
  COUNT(p.id) as payment_count,
  SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END) as total_revenue
FROM subscriptions s
LEFT JOIN organizations o ON s.organization_id = o.organization_id
LEFT JOIN payments p ON p.subscription_id = s.id
WHERE s.status IN ('active', 'trialing')
GROUP BY s.id, o.organization_name, o.custom_template_limit, 
         o.custom_team_limit, o.custom_manager_limit, o.custom_monthly_submissions;

-- Step 8: Grant proper permissions
GRANT SELECT ON active_subscriptions TO authenticated;
