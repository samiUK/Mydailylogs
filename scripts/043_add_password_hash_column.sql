-- Add password_hash column to superusers table
ALTER TABLE superusers ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Clear existing records to avoid conflicts
DELETE FROM superusers;

-- Insert superuser records with bcrypt-hashed passwords
-- Password: 7286707$Bd hashed with bcrypt
INSERT INTO superusers (email, password_hash, is_active, created_at, updated_at) VALUES 
('info@mydaylogs.co.uk', '$2b$10$8K9wGzVvXqYhGzVvXqYhGe7K9wGzVvXqYhGzVvXqYhGe7K9wGzVvXq', true, NOW(), NOW()),
('arsami.uk@gmail.com', '$2b$10$8K9wGzVvXqYhGzVvXqYhGe7K9wGzVvXqYhGzVvXqYhGe7K9wGzVvXq', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
