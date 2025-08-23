-- Add detailed address fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS address_line_1 text,
ADD COLUMN IF NOT EXISTS address_line_2 text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS postcode text,
ADD COLUMN IF NOT EXISTS country text;

-- Update existing address data to address_line_1 if needed
UPDATE public.profiles 
SET address_line_1 = address 
WHERE address IS NOT NULL AND address_line_1 IS NULL;
