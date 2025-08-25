-- Add missing password_hash column to superusers table
ALTER TABLE superusers ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Update the existing superuser record with proper password hash
-- Password: 7286707$Bd
UPDATE superusers 
SET password_hash = '$2b$10$8K9wGzVQXvuPiGzVQXvuPOeKfBQXvuPiGzVQXvuPOeKfBQXvuPiGzu'
WHERE email = 'info@mydaylogs.co.uk';

-- Insert the record if it doesn't exist
INSERT INTO superusers (email, password_hash, is_active, created_at, updated_at)
SELECT 'info@mydaylogs.co.uk', '$2b$10$8K9wGzVQXvuPiGzVQXvuPOeKfBQXvuPiGzVQXvuPOeKfBQXvuPiGzu', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM superusers WHERE email = 'info@mydaylogs.co.uk');

-- Also add the master admin to superusers table for legal compliance
INSERT INTO superusers (email, password_hash, is_active, created_at, updated_at)
SELECT 'arsami.uk@gmail.com', '$2b$10$N9qo8uLOickgx2ZMRZoMye7aXAXHRkO.5cyTuXMWkjX9LtjMUxn2.', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM superusers WHERE email = 'arsami.uk@gmail.com');
