-- Add page_url column to feedback table to track which page users were on when submitting feedback
ALTER TABLE feedback ADD COLUMN page_url TEXT;

-- Add comment to document the column purpose
COMMENT ON COLUMN feedback.page_url IS 'URL of the page where the user submitted the feedback';
