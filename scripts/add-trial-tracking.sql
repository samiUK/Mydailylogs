-- Add column to track if organization has ever used a trial
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS has_used_trial boolean DEFAULT false;

-- Mark existing trials as having used trial
UPDATE subscriptions
SET has_used_trial = true
WHERE is_trial = true OR trial_ends_at IS NOT NULL;
