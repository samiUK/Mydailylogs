-- Create table to store unique promo codes for campaigns
CREATE TABLE IF NOT EXISTS promo_campaign_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES promo_campaigns(id) ON DELETE CASCADE,
  promo_code TEXT NOT NULL UNIQUE,
  is_issued BOOLEAN DEFAULT FALSE,
  issued_to_email TEXT,
  issued_at TIMESTAMP WITH TIME ZONE,
  is_redeemed BOOLEAN DEFAULT FALSE,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_code_per_campaign UNIQUE(campaign_id, promo_code)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_campaign ON promo_campaign_codes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_issued ON promo_campaign_codes(is_issued, is_redeemed);
CREATE INDEX IF NOT EXISTS idx_promo_codes_email ON promo_campaign_codes(issued_to_email);

-- Add column to social_shares to track which unique code was issued
ALTER TABLE social_shares 
ADD COLUMN IF NOT EXISTS unique_promo_code TEXT;

-- Enable RLS
ALTER TABLE promo_campaign_codes ENABLE ROW LEVEL SECURITY;

-- Master admin can view all codes
CREATE POLICY "Master admin can view promo codes"
  ON promo_campaign_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM superusers 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_active = true
    )
  );

-- Service role has full access
CREATE POLICY "Service role full access to promo codes"
  ON promo_campaign_codes FOR ALL
  USING (true)
  WITH CHECK (true);
