-- Create promo code redemptions tracking table for anti-fraud measures
CREATE TABLE IF NOT EXISTS promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  promo_code TEXT NOT NULL,
  stripe_checkout_session_id TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  plan_name TEXT NOT NULL,
  discount_amount NUMERIC,
  ip_address INET,
  user_agent TEXT,
  
  UNIQUE(user_email, promo_code)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_email ON promo_code_redemptions(user_email);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_org ON promo_code_redemptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON promo_code_redemptions(promo_code);

-- Add cooldown tracking to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS last_subscription_cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_cancel_count INTEGER DEFAULT 0;

-- Create checkout rate limiting table
CREATE TABLE IF NOT EXISTS checkout_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  ip_address INET NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  first_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_until TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(user_email, ip_address)
);

-- Create index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_checkout_limits_email ON checkout_rate_limits(user_email);
CREATE INDEX IF NOT EXISTS idx_checkout_limits_ip ON checkout_rate_limits(ip_address);

COMMENT ON TABLE promo_code_redemptions IS 'Tracks promo code usage to prevent abuse - ensures one code per customer';
COMMENT ON TABLE checkout_rate_limits IS 'Rate limiting for checkout attempts to prevent code brute-forcing';
COMMENT ON COLUMN organizations.last_subscription_cancelled_at IS 'Tracks when organization last canceled subscription for cooldown period';
