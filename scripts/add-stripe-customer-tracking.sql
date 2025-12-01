-- Add Stripe customer ID to subscriptions table for cross-platform tracking
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create index for fast customer lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id 
ON subscriptions(stripe_customer_id);

-- Create index for fast subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id 
ON subscriptions(stripe_subscription_id);

COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe customer ID (cus_xxx) for cross-platform tracking';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID (sub_xxx) - duplicate of id column for clarity';
