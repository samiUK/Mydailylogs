-- Add hardcoded master admin credentials to superusers table for legal compliance
-- This ensures all masterdashboard access credentials are tracked in the database

INSERT INTO superusers (email, password_hash, user_type, created_at, updated_at)
VALUES (
  'arsami.uk@gmail.com',
  -- Hash of '7286707$Bd' using bcrypt
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'master_admin',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  user_type = EXCLUDED.user_type,
  updated_at = NOW();

-- Add comment for audit trail
COMMENT ON TABLE superusers IS 'Contains all master dashboard access credentials including hardcoded master admin for legal compliance and audit purposes';
