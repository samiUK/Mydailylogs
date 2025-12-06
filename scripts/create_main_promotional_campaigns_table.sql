-- Create the main promotional_campaigns table for managing campaign settings
CREATE TABLE IF NOT EXISTS promotional_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  promo_code_template TEXT NOT NULL, -- e.g., "FIRST100", "SUMMER30"
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  max_redemptions INTEGER NOT NULL DEFAULT 100,
  current_redemptions INTEGER NOT NULL DEFAULT 0,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('feedback_and_share', 'feedback_only', 'share_only', 'referral', 'first_time_user')),
  is_active BOOLEAN DEFAULT FALSE,
  stripe_coupon_id TEXT, -- Auto-generated Stripe coupon ID
  stripe_promotion_code_id TEXT, -- Auto-generated Stripe promotion code ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Ensure unique promo code templates
  UNIQUE(promo_code_template)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON promotional_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_campaigns_code ON promotional_campaigns(promo_code_template);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON promotional_campaigns(created_at);

-- Enable RLS
ALTER TABLE promotional_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: Master admin can manage all campaigns
CREATE POLICY "Master admin can manage campaigns"
  ON promotional_campaigns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM superusers 
      WHERE email = (SELECT email FROM profiles WHERE id = auth.uid())
      AND role = 'master_admin'
    )
  );

-- Policy: Anyone can view active campaigns (for frontend display)
CREATE POLICY "Anyone can view active campaigns"
  ON promotional_campaigns
  FOR SELECT
  USING (is_active = true);

COMMENT ON TABLE promotional_campaigns IS 'Main promotional campaigns management table - controls discount campaigns';
