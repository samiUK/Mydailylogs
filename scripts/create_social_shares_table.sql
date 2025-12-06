-- Create social_shares table to track when users click social share buttons
CREATE TABLE IF NOT EXISTS social_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
  feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
  share_platform TEXT NOT NULL CHECK (share_platform IN ('facebook', 'twitter', 'linkedin', 'other')),
  promo_code TEXT,
  campaign_id UUID,
  ip_address INET,
  user_agent TEXT,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for quick lookups
CREATE INDEX idx_social_shares_user_email ON social_shares(user_email);
CREATE INDEX idx_social_shares_feedback_id ON social_shares(feedback_id);
CREATE INDEX idx_social_shares_promo_code ON social_shares(promo_code);
CREATE INDEX idx_social_shares_campaign_id ON social_shares(campaign_id);
CREATE INDEX idx_social_shares_shared_at ON social_shares(shared_at);

-- Enable RLS
ALTER TABLE social_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (for tracking)
CREATE POLICY "Anyone can track social shares"
  ON social_shares FOR INSERT
  WITH CHECK (true);

-- Policy: Master admin can view all shares
CREATE POLICY "Master admin can view all shares"
  ON social_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM superusers
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

COMMENT ON TABLE social_shares IS 'Tracks when users click social share buttons after providing feedback';
COMMENT ON COLUMN social_shares.feedback_id IS 'Links back to the original feedback submission';
COMMENT ON COLUMN social_shares.promo_code IS 'The promo code that was included in the share';
COMMENT ON COLUMN social_shares.campaign_id IS 'The active campaign at time of sharing';
