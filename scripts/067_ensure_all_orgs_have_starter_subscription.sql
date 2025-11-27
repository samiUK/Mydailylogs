-- Ensure all organizations have at least a Starter subscription
-- This script adds a Starter subscription to any organization that doesn't have one

INSERT INTO subscriptions (
  id,
  organization_id,
  plan_name,
  status,
  created_at,
  updated_at,
  current_period_start,
  current_period_end
)
SELECT 
  gen_random_uuid(),
  o.organization_id,
  'Starter',
  'active',
  NOW(),
  NOW(),
  NOW(),
  NOW() + INTERVAL '100 years'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 
  FROM subscriptions s 
  WHERE s.organization_id = o.organization_id
)
ON CONFLICT DO NOTHING;

-- Verify the migration
SELECT 
  COUNT(*) as total_organizations,
  (SELECT COUNT(*) FROM subscriptions) as total_subscriptions,
  (SELECT COUNT(DISTINCT organization_id) FROM subscriptions) as orgs_with_subscriptions
FROM organizations;
