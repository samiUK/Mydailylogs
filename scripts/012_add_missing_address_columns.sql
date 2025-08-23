-- Add missing address and contact columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS address_line_1 text,
ADD COLUMN IF NOT EXISTS address_line_2 text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS postcode text,
ADD COLUMN IF NOT EXISTS country text;

-- Update existing profiles to have empty strings instead of null for better UX
UPDATE public.profiles 
SET 
  phone = COALESCE(phone, ''),
  address_line_1 = COALESCE(address_line_1, ''),
  address_line_2 = COALESCE(address_line_2, ''),
  city = COALESCE(city, ''),
  postcode = COALESCE(postcode, ''),
  country = COALESCE(country, '')
WHERE phone IS NULL OR address_line_1 IS NULL OR address_line_2 IS NULL 
   OR city IS NULL OR postcode IS NULL OR country IS NULL;
