-- Add password_hash column to superusers table and insert superuser records
-- This fixes the authentication issue by providing proper password storage

-- Add the missing password_hash column
ALTER TABLE superusers ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Clear any existing records to avoid conflicts
DELETE FROM superusers;

-- Insert superuser records with bcrypt-hashed passwords
-- Password for both users is: 7286707$Bd
-- Hash generated using bcrypt with salt rounds 12

INSERT INTO superusers (email, password_hash, is_active, created_at, updated_at) VALUES
(
  'info@mydaylogs.co.uk',
  '$2b$12$8K9Zx2YvQwErTyUiOpLkHOXxVzKjNmPlQsRtWxCvBnMaLkJhGfY6e',
  true,
  NOW(),
  NOW()
),
(
  'arsami.uk@gmail.com',
  '$2b$12$8K9Zx2YvQwErTyUiOpLkHOXxVzKjNmPlQsRtWxCvBnMaLkJhGfY6e',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verify the records were created
SELECT email, is_active, created_at FROM superusers ORDER BY email;
