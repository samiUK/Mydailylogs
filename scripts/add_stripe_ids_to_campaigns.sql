-- Add Stripe coupon and promotion code IDs to promo_campaigns table
ALTER TABLE promo_campaigns
ADD COLUMN IF NOT EXISTS stripe_coupon_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_promo_code_id TEXT;

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_promo_campaigns_stripe_coupon ON promo_campaigns(stripe_coupon_id);
CREATE INDEX IF NOT EXISTS idx_promo_campaigns_stripe_promo ON promo_campaigns(stripe_promo_code_id);
