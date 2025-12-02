-- Add column to track if trial was initiated by masteradmin for testing purposes
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS is_masteradmin_trial boolean DEFAULT false;

COMMENT ON COLUMN subscriptions.is_masteradmin_trial IS 'True if trial was initiated by masteradmin for testing purposes (auto-downgrades to Starter after 30 days)';
