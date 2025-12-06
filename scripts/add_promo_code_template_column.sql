-- Add promo_code_template column to store the universal promo code for each campaign
ALTER TABLE promo_campaigns
ADD COLUMN IF NOT EXISTS promo_code_template TEXT;

-- Update existing campaign to use universal code
UPDATE promo_campaigns
SET promo_code_template = 'SOCIAL20',
    description = 'First 100 users to share feedback and post on social media get 20% off their first paid month using code SOCIAL20'
WHERE campaign_id = 'feedback-social-20';

-- Add comment for clarity
COMMENT ON COLUMN promo_campaigns.promo_code_template IS 'Universal promo code that all qualified users will receive (e.g., SOCIAL20). This code must be created in Stripe Dashboard first.';
