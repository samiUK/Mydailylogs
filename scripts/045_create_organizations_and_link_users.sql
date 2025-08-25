-- Create test organizations
INSERT INTO organizations (id, name, slug, logo_url, primary_color, secondary_color, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'MyDayLogs HQ', 'mydaylogs-hq', '/placeholder.svg?height=40&width=40', '#3b82f6', '#1e40af', NOW(), NOW()),
  (gen_random_uuid(), 'Demo Restaurant', 'demo-restaurant', '/placeholder.svg?height=40&width=40', '#ef4444', '#dc2626', NOW(), NOW()),
  (gen_random_uuid(), 'Sample Retail Store', 'sample-retail', '/placeholder.svg?height=40&width=40', '#10b981', '#059669', NOW(), NOW()),
  (gen_random_uuid(), 'Test Hotel Group', 'test-hotel', '/placeholder.svg?height=40&width=40', '#f59e0b', '#d97706', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Update existing profiles to link them to organizations
-- First, get the organization IDs
WITH org_ids AS (
  SELECT id, name FROM organizations LIMIT 4
),
profile_updates AS (
  SELECT 
    p.id as profile_id,
    (SELECT id FROM org_ids ORDER BY random() LIMIT 1) as org_id
  FROM profiles p
  WHERE p.organization_id IS NULL
)
UPDATE profiles 
SET organization_id = profile_updates.org_id,
    updated_at = NOW()
FROM profile_updates
WHERE profiles.id = profile_updates.profile_id;

-- Create some additional test profiles if none exist
INSERT INTO profiles (id, email, full_name, first_name, last_name, role, organization_id, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'admin@' || o.slug || '.com',
  'Admin User - ' || o.name,
  'Admin',
  'User',
  'admin',
  o.id,
  NOW(),
  NOW()
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.organization_id = o.id AND p.role = 'admin'
)
ON CONFLICT (email) DO NOTHING;

-- Create staff users for each organization
INSERT INTO profiles (id, email, full_name, first_name, last_name, role, organization_id, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'staff@' || o.slug || '.com',
  'Staff User - ' || o.name,
  'Staff',
  'User',
  'staff',
  o.id,
  NOW(),
  NOW()
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.organization_id = o.id AND p.role = 'staff'
)
ON CONFLICT (email) DO NOTHING;
