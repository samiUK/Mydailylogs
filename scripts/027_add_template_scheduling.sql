-- Add enhanced scheduling columns to checklist_templates table
ALTER TABLE checklist_templates 
ADD COLUMN IF NOT EXISTS schedule_type text DEFAULT 'recurring',
ADD COLUMN IF NOT EXISTS specific_date date,
ADD COLUMN IF NOT EXISTS deadline_date date,
ADD COLUMN IF NOT EXISTS schedule_time time;

-- Update existing templates to use the new schedule_type
UPDATE checklist_templates 
SET schedule_type = 'recurring' 
WHERE schedule_type IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN checklist_templates.schedule_type IS 'Type of scheduling: recurring, specific_date, deadline';
COMMENT ON COLUMN checklist_templates.specific_date IS 'Specific date when template should be completed (for one-time tasks)';
COMMENT ON COLUMN checklist_templates.deadline_date IS 'Deadline date by which template must be completed';
COMMENT ON COLUMN checklist_templates.schedule_time IS 'Specific time for scheduled tasks';
