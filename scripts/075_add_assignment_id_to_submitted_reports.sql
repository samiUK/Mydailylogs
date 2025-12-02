-- Add assignment_id column to submitted_reports to track which specific assignment generated each report
-- This enables proper tracking of the Template -> Assignment (unique instance) -> Report flow

ALTER TABLE submitted_reports 
ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES template_assignments(id) ON DELETE SET NULL;

-- Add index for performance when querying reports by assignment
CREATE INDEX IF NOT EXISTS idx_submitted_reports_assignment_id ON submitted_reports(assignment_id);

-- Add daily_checklist_id column to track daily recurring template instances
ALTER TABLE submitted_reports
ADD COLUMN IF NOT EXISTS daily_checklist_id UUID REFERENCES daily_checklists(id) ON DELETE SET NULL;

-- Add index for daily checklist lookups
CREATE INDEX IF NOT EXISTS idx_submitted_reports_daily_checklist_id ON submitted_reports(daily_checklist_id);

COMMENT ON COLUMN submitted_reports.assignment_id IS 'Links to the specific template_assignments record that generated this report';
COMMENT ON COLUMN submitted_reports.daily_checklist_id IS 'Links to the specific daily_checklists record that generated this report';
