-- First update the constraint to allow lowercase plan names
ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_plan_name_check;

ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_plan_name_check 
CHECK (plan_name IN ('starter', 'growth', 'scale'));

-- Add Starter plan subscriptions to all organizations that don't have one
INSERT INTO subscriptions (
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
  NOW() + INTERVAL '100 years', -- Free plan never expires
  NOW(),
  NOW()
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s 
  WHERE s.organization_id = o.organization_id
);

-- Create a trigger function to auto-assign Starter plan to new organizations
CREATE OR REPLACE FUNCTION assign_starter_plan()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (
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
    NOW() + INTERVAL '100 years',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_organization_created ON organizations;

-- Create trigger on organizations table
CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION assign_starter_plan();
