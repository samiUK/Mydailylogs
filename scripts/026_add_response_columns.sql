-- Add missing columns to checklist_responses table for storing response values and photos
ALTER TABLE checklist_responses 
ADD COLUMN IF NOT EXISTS response_value TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN checklist_responses.response_value IS 'Stores the user response for the checklist item (text, number, boolean values)';
COMMENT ON COLUMN checklist_responses.photo_url IS 'Stores the URL of uploaded photos for photo-type checklist items';
