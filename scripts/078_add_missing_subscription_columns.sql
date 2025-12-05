-- Add missing columns to subscriptions table for proper cancellation tracking

-- Add cancel_at_period_end column
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Add cancelled_at timestamp
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Update existing cancelled subscriptions
UPDATE subscriptions 
SET cancel_at_period_end = TRUE
WHERE status = 'cancelled' AND cancel_at_period_end IS NULL;

-- Add comment
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at end of current billing period';
COMMENT ON COLUMN subscriptions.cancelled_at IS 'Timestamp when subscription was cancelled';
