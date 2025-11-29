-- Remove the unique constraint that prevents multiple assignments
ALTER TABLE template_assignments DROP CONSTRAINT IF EXISTS template_assignments_template_id_assigned_to_is_active_key;

-- Add due_date column to track when each assignment is due
ALTER TABLE template_assignments ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Update existing assignments to set due_date from template
UPDATE template_assignments ta
SET due_date = COALESCE(
  (SELECT specific_date FROM checklist_templates WHERE id = ta.template_id),
  (SELECT deadline_date FROM checklist_templates WHERE id = ta.template_id)
)
WHERE due_date IS NULL;
