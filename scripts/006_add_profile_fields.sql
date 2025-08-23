-- Add additional profile fields for user information
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS address TEXT;

-- Update existing profiles to populate first_name and last_name from full_name
UPDATE public.profiles 
SET 
  first_name = SPLIT_PART(full_name, ' ', 1),
  last_name = CASE 
    WHEN array_length(string_to_array(full_name, ' '), 1) > 1 
    THEN array_to_string(string_to_array(full_name, ' ')[2:], ' ')
    ELSE ''
  END
WHERE first_name IS NULL OR last_name IS NULL;
