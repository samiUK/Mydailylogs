-- Add email column to external_submissions table
ALTER TABLE external_submissions
ADD COLUMN IF NOT EXISTS submitter_email TEXT;

-- Create index for email searches
CREATE INDEX IF NOT EXISTS idx_external_submissions_email 
ON external_submissions(submitter_email);

-- Add comment
COMMENT ON COLUMN external_submissions.submitter_email IS 'Email address of external contractor who submitted the form';
