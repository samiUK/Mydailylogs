-- Add payment failure grace period tracking to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS payment_failed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_retry_count integer DEFAULT 0;

-- Add index for grace period queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_period ON subscriptions(grace_period_ends_at) WHERE status = 'past_due';
