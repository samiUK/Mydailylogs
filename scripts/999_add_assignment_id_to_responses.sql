-- Add assignment_id column to checklist_responses table
-- This links responses directly to template_assignments for proper isolation

ALTER TABLE checklist_responses
ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES template_assignments(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_checklist_responses_assignment_id ON checklist_responses(assignment_id);

-- Backfill existing responses by linking them to assignments via checklist_id
-- This assumes checklist_id corresponds to daily_checklists which link to template_assignments
UPDATE checklist_responses cr
SET assignment_id = (
  SELECT ta.id
  FROM daily_checklists dc
  JOIN template_assignments ta ON ta.template_id = dc.template_id AND ta.assigned_to = dc.assigned_to
  WHERE dc.id = cr.checklist_id
  LIMIT 1
)
WHERE cr.assignment_id IS NULL AND cr.checklist_id IS NOT NULL;
