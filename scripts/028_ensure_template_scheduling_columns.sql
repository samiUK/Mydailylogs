-- Ensure the template scheduling columns exist
-- This is a safe migration that only adds columns if they don't exist

DO $$ 
BEGIN
    -- Add schedule_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checklist_templates' 
                   AND column_name = 'schedule_type') THEN
        ALTER TABLE checklist_templates 
        ADD COLUMN schedule_type text DEFAULT 'recurring';
    END IF;

    -- Add specific_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checklist_templates' 
                   AND column_name = 'specific_date') THEN
        ALTER TABLE checklist_templates 
        ADD COLUMN specific_date date;
    END IF;

    -- Add deadline_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checklist_templates' 
                   AND column_name = 'deadline_date') THEN
        ALTER TABLE checklist_templates 
        ADD COLUMN deadline_date date;
    END IF;

    -- Add schedule_time column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checklist_templates' 
                   AND column_name = 'schedule_time') THEN
        ALTER TABLE checklist_templates 
        ADD COLUMN schedule_time time;
    END IF;
END $$;

-- Update existing templates to use the new schedule_type
UPDATE checklist_templates 
SET schedule_type = 'recurring' 
WHERE schedule_type IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN checklist_templates.schedule_type IS 'Type of scheduling: recurring, specific_date, deadline';
COMMENT ON COLUMN checklist_templates.specific_date IS 'Specific date when template should be completed (for one-time tasks)';
COMMENT ON COLUMN checklist_templates.deadline_date IS 'Deadline date by which template must be completed';
COMMENT ON COLUMN checklist_templates.schedule_time IS 'Specific time for scheduled tasks';
