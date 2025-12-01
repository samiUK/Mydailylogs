-- Add column to track if a USER (not organization) has ever used a trial
-- This prevents users from creating multiple organizations to get multiple trials

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_has_used_trial ON profiles(has_used_trial);

-- Update existing users who have trial subscriptions
UPDATE profiles
SET has_used_trial = true
WHERE id IN (
  SELECT DISTINCT p.id
  FROM profiles p
  INNER JOIN subscriptions s ON s.organization_id = p.organization_id
  WHERE s.is_trial = true OR s.has_used_trial = true
);

COMMENT ON COLUMN profiles.has_used_trial IS 'Tracks if this user has EVER used a trial across ANY organization to prevent trial abuse';
