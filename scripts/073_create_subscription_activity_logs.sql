-- Create subscription activity logs table to track all subscription changes
CREATE TABLE IF NOT EXISTS subscription_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_subscription_id TEXT,
  event_type TEXT NOT NULL, -- 'created', 'upgraded', 'downgraded', 'cancelled', 'renewed', 'trial_started', 'trial_ended', 'payment_failed', 'reactivated'
  from_plan TEXT, -- Previous plan (null for new subscriptions)
  to_plan TEXT NOT NULL, -- New plan
  from_status TEXT, -- Previous status
  to_status TEXT NOT NULL, -- New status
  amount NUMERIC(10, 2), -- Amount in dollars (if applicable)
  currency TEXT DEFAULT 'usd',
  triggered_by TEXT, -- 'customer', 'admin', 'stripe_webhook', 'cron_job', 'system'
  admin_email TEXT, -- Email of admin who made the change (if applicable)
  details JSONB, -- Additional context and metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscription_activity_organization ON subscription_activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_activity_subscription ON subscription_activity_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_activity_event_type ON subscription_activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_activity_created_at ON subscription_activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE subscription_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy for master admins to view all logs
CREATE POLICY "Master admins can view all subscription activity logs"
  ON subscription_activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM superusers
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

-- Policy for system to insert logs
CREATE POLICY "System can insert subscription activity logs"
  ON subscription_activity_logs
  FOR INSERT
  WITH CHECK (true);
