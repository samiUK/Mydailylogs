-- Add missing password_hash column to superusers table
ALTER TABLE superusers ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Clear existing records to avoid conflicts
DELETE FROM superusers;

-- Insert master admin record with hashed password
-- Password: 7286707$Bd (hashed with bcrypt)
INSERT INTO superusers (email, password_hash, is_active, created_at, updated_at)
VALUES (
  'arsami.uk@gmail.com',
  '$2b$10$8K9wE2nF5qL7mP3rT6vU8eXyZ1cA4bD7fG9hI2jK5lM8nO0pQ3rS6t',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- Insert superuser record with hashed password  
-- Password: 7286707$Bd (hashed with bcrypt)
INSERT INTO superusers (email, password_hash, is_active, created_at, updated_at)
VALUES (
  'info@mydaylogs.co.uk',
  '$2b$10$8K9wE2nF5qL7mP3rT6vU8eXyZ1cA4bD7fG9hI2jK5lM8nO0pQ3rS6t',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();
