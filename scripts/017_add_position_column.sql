-- Add position column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN position TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN public.profiles.position IS 'Job position/title of the team member';
