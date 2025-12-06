-- Add stripe_promotion_code_id column to track individual Stripe promotion codes
ALTER TABLE unique_promo_codes
ADD COLUMN IF NOT EXISTS stripe_promotion_code_id text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_unique_promo_codes_stripe_id 
ON unique_promo_codes(stripe_promotion_code_id);

COMMENT ON COLUMN unique_promo_codes.stripe_promotion_code_id IS 'Stripe promotion code ID for individual code validation';
