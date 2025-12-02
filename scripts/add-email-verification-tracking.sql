-- Add email verification tracking separate from Supabase auth
-- This allows users to login immediately while still encouraging email verification

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false;

-- Mark existing users as verified (grandfather them in)
UPDATE profiles
SET is_email_verified = true
WHERE is_email_verified IS NULL OR is_email_verified = false;

COMMENT ON COLUMN profiles.is_email_verified IS 'Tracks whether user clicked verification link from Resend email (separate from Supabase auth email_confirmed_at)';
