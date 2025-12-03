-- Add is_masteradmin_trial column to subscriptions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'is_masteradmin_trial'
    ) THEN
        ALTER TABLE subscriptions 
        ADD COLUMN is_masteradmin_trial boolean DEFAULT false;
        
        COMMENT ON COLUMN subscriptions.is_masteradmin_trial IS 'Flag for free complimentary trials given by master admin (not counted as paid customers)';
    END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_masteradmin_trial 
ON subscriptions(is_masteradmin_trial) 
WHERE is_masteradmin_trial = true;
