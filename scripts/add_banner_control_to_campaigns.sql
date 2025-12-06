-- Add banner control fields to promotional_campaigns table
ALTER TABLE promotional_campaigns
ADD COLUMN IF NOT EXISTS show_on_banner BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS banner_message TEXT,
ADD COLUMN IF NOT EXISTS banner_cta_text TEXT DEFAULT 'Give Feedback';

-- Add index for efficient banner queries
CREATE INDEX IF NOT EXISTS idx_promotional_campaigns_banner 
ON promotional_campaigns(show_on_banner, is_active) 
WHERE show_on_banner = true AND is_active = true;

COMMENT ON COLUMN promotional_campaigns.show_on_banner IS 'Whether this campaign should be displayed on the homepage banner';
COMMENT ON COLUMN promotional_campaigns.banner_message IS 'Custom message to display on the banner (supports {discount} placeholder for dynamic discount value)';
COMMENT ON COLUMN promotional_campaigns.banner_cta_text IS 'Text for the call-to-action button on the banner';
