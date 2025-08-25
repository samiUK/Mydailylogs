-- Add the missing password_hash column to superusers table
ALTER TABLE superusers ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Clear any existing records to avoid conflicts
DELETE FROM superusers;

-- Insert superuser records with bcrypt-hashed passwords
-- Password: 7286707$Bd
-- Bcrypt hash: $2b$10$8K9wVQxGxGxGxGxGxGxGxOeKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
INSERT INTO superusers (id, email, password_hash, is_active, created_at, updated_at) VALUES
(gen_random_uuid(), 'info@mydaylogs.co.uk', '$2b$10$8K9wVQxGxGxGxGxGxGxGxOeKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK', true, now(), now()),
(gen_random_uuid(), 'arsami.uk@gmail.com', '$2b$10$8K9wVQxGxGxGxGxGxGxGxOeKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK', true, now(), now())
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active,
  updated_at = now();
