-- Add support for generic codes without unique tracking
ALTER TABLE promotional_campaigns
ADD COLUMN IF NOT EXISTS generate_unique_codes BOOLEAN DEFAULT true;

COMMENT ON COLUMN promotional_campaigns.generate_unique_codes IS 'If false, only creates Stripe coupon without unique tracking codes';
