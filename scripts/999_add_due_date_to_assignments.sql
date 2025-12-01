-- Add due_date column to template_assignments table
ALTER TABLE template_assignments ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Update existing assignments to set due_date from template
UPDATE template_assignments ta
SET due_date = COALESCE(
  (SELECT specific_date FROM checklist_templates WHERE id = ta.template_id),
  (SELECT deadline_date FROM checklist_templates WHERE id = ta.template_id)
)
WHERE due_date IS NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_template_assignments_due_date ON template_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_template_assignments_status_active ON template_assignments(status, is_active);
