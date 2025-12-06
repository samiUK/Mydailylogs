-- Create promotional campaign tracking table
CREATE TABLE IF NOT EXISTS promotional_campaign_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
  feedback_message TEXT NOT NULL,
  social_media_platform TEXT, -- 'twitter', 'linkedin', 'facebook', 'instagram'
  social_media_proof_url TEXT, -- Link to the social media post
  promo_code TEXT NOT NULL UNIQUE, -- Generated unique promo code for this user
  discount_percentage INTEGER NOT NULL DEFAULT 20,
  is_code_sent BOOLEAN DEFAULT FALSE,
  code_sent_at TIMESTAMP WITH TIME ZONE,
  is_redeemed BOOLEAN DEFAULT FALSE,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  stripe_coupon_id TEXT, -- Stripe coupon ID created for this code
  submission_rank INTEGER, -- Position in queue (1-100)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  
  -- Ensure one submission per email
  UNIQUE(user_email)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_promo_campaign_email ON promotional_campaign_submissions(user_email);
CREATE INDEX IF NOT EXISTS idx_promo_campaign_code ON promotional_campaign_submissions(promo_code);
CREATE INDEX IF NOT EXISTS idx_promo_campaign_rank ON promotional_campaign_submissions(submission_rank);
CREATE INDEX IF NOT EXISTS idx_promo_campaign_created ON promotional_campaign_submissions(created_at);

-- Enable RLS
ALTER TABLE promotional_campaign_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own submission
CREATE POLICY "Users can view their own promo submission"
  ON promotional_campaign_submissions
  FOR SELECT
  USING (user_email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- Policy: System can insert submissions (via API)
CREATE POLICY "System can insert promo submissions"
  ON promotional_campaign_submissions
  FOR INSERT
  WITH CHECK (true);

-- Policy: Master admin can view all submissions
CREATE POLICY "Master admin can view all promo submissions"
  ON promotional_campaign_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM superusers 
      WHERE email = (SELECT email FROM profiles WHERE id = auth.uid())
      AND role = 'master_admin'
    )
  );

COMMENT ON TABLE promotional_campaign_submissions IS 'Tracks first 100 users promotional campaign - feedback + social sharing = 20% discount';
