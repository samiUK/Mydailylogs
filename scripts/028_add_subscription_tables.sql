-- Add subscription and billing tables for SaaS functionality

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  max_templates INTEGER NOT NULL,
  max_team_members INTEGER NOT NULL,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, canceled, past_due, unpaid
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create billing history table
CREATE TABLE IF NOT EXISTS billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'gbp',
  status TEXT NOT NULL, -- paid, pending, failed
  invoice_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price_monthly, price_yearly, max_templates, max_team_members, features) VALUES
('Free', 0.00, 0.00, 3, 5, '{"reports_branding": "mydailylog", "support": "community"}'),
('Base', 19.00, 190.00, 10, 30, '{"reports_branding": "custom", "support": "email", "priority_support": false}'),
('Pro', 39.00, 390.00, 30, 100, '{"reports_branding": "custom", "support": "priority", "priority_support": true, "advanced_analytics": true}')
ON CONFLICT DO NOTHING;

-- Add subscription_id to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_organization_id ON billing_history(organization_id);

-- Enable RLS on new tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_plans (public read access)
CREATE POLICY "Anyone can view subscription plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- RLS policies for subscriptions (organization members only)
CREATE POLICY "Users can view their organization's subscription" ON subscriptions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their organization's subscription" ON subscriptions
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS policies for billing_history (organization admins only)
CREATE POLICY "Admins can view their organization's billing history" ON billing_history
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
