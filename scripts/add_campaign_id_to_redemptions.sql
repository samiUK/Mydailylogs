-- Add campaign_id to promo_code_redemptions table to link redemptions with campaigns
ALTER TABLE promo_code_redemptions
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES promotional_campaigns(campaign_id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_campaign_id ON promo_code_redemptions(campaign_id);

-- Add comment
COMMENT ON COLUMN promo_code_redemptions.campaign_id IS 'Links redemption to the promotional campaign';
