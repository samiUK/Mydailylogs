-- Add missing columns to profiles table that the application expects
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS position text,
ADD COLUMN IF NOT EXISTS reports_to uuid REFERENCES public.profiles(id);

-- Add index for reports_to foreign key for better performance
CREATE INDEX IF NOT EXISTS profiles_reports_to_idx ON public.profiles(reports_to);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;
