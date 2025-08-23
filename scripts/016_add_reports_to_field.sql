-- Add reports_to field to profiles table for organizational hierarchy
ALTER TABLE public.profiles 
ADD COLUMN reports_to uuid REFERENCES public.profiles(id);

-- Add index for better query performance
CREATE INDEX idx_profiles_reports_to ON public.profiles(reports_to);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.reports_to IS 'References the profile ID of the person this user reports to (manager/supervisor)';
