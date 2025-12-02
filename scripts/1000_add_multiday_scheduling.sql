-- Add support for multi-day scheduling
-- This allows templates to be scheduled for multiple specific dates

-- Add new column to store multiple dates as JSON array
ALTER TABLE checklist_templates
ADD COLUMN IF NOT EXISTS multi_day_dates JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the field
COMMENT ON COLUMN checklist_templates.multi_day_dates IS 'Array of dates for multi_day schedule_type. Example: ["2025-01-15", "2025-01-30"]';

-- Create index for better query performance on multi_day_dates
CREATE INDEX IF NOT EXISTS idx_checklist_templates_multi_day_dates 
ON checklist_templates USING GIN (multi_day_dates);

-- Add check constraint to ensure multi_day_dates is an array
ALTER TABLE checklist_templates
ADD CONSTRAINT check_multi_day_dates_is_array
CHECK (jsonb_typeof(multi_day_dates) = 'array' OR multi_day_dates IS NULL);
