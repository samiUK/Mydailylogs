-- Add schedule_type column to template_assignments if it doesn't exist
ALTER TABLE template_assignments 
ADD COLUMN IF NOT EXISTS schedule_type TEXT;

-- Sync schedule_type from templates to assignments for existing records
UPDATE template_assignments ta
SET schedule_type = ct.schedule_type
FROM checklist_templates ct
WHERE ta.template_id = ct.id
AND ta.schedule_type IS NULL;

-- Add index for faster queries on schedule_type
CREATE INDEX IF NOT EXISTS idx_template_assignments_schedule_type 
ON template_assignments(schedule_type);

-- Ensure is_recurring and schedule_type are synchronized in templates
UPDATE checklist_templates
SET is_recurring = true
WHERE schedule_type = 'recurring' AND is_recurring IS NOT true;

UPDATE checklist_templates
SET is_recurring = false
WHERE schedule_type IN ('one-off', 'specific_date', 'deadline') AND is_recurring IS NOT false;

-- Set recurrence_type from frequency for recurring templates
UPDATE checklist_templates
SET recurrence_type = frequency
WHERE schedule_type = 'recurring' AND recurrence_type IS NULL;
