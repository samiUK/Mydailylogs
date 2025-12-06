-- Add the generate_unique_codes column to promotional_campaigns table
ALTER TABLE promotional_campaigns 
ADD COLUMN IF NOT EXISTS generate_unique_codes BOOLEAN DEFAULT true;

-- Update existing campaigns to have this field set
UPDATE promotional_campaigns 
SET generate_unique_codes = true 
WHERE generate_unique_codes IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN promotional_campaigns.generate_unique_codes IS 
'Determines if the campaign generates individual tracking codes (true) or uses a single generic code (false)';
