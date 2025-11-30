-- Add trial support to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_trial boolean DEFAULT false;

-- Create index for trial expiration checks
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends_at 
ON subscriptions(trial_ends_at) 
WHERE is_trial = true AND status = 'active';

COMMENT ON COLUMN subscriptions.trial_ends_at IS 'When the free trial expires (null for paid subscriptions)';
COMMENT ON COLUMN subscriptions.is_trial IS 'Whether this is a free trial subscription';
