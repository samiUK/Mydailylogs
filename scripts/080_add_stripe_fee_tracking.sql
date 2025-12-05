-- Add Stripe fee tracking columns to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS stripe_processing_fee numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS customer_country text,
ADD COLUMN IF NOT EXISTS card_region text CHECK (card_region IN ('domestic', 'international_eea', 'international_non_eea')),
ADD COLUMN IF NOT EXISTS currency_conversion_fee numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refundable_amount numeric(10,2);

-- Add comment explaining fee structure
COMMENT ON COLUMN payments.stripe_processing_fee IS 'Non-refundable Stripe processing fee (percentage + fixed fee)';
COMMENT ON COLUMN payments.net_amount IS 'Amount received after Stripe fees';
COMMENT ON COLUMN payments.refundable_amount IS 'Maximum amount that can be refunded to customer (excludes Stripe fees)';
COMMENT ON COLUMN payments.currency_conversion_fee IS 'Non-refundable currency conversion fee if applicable';

-- Update existing payments to set refundable_amount = amount (for backwards compatibility)
UPDATE payments 
SET refundable_amount = amount, 
    net_amount = amount
WHERE refundable_amount IS NULL;
