-- Add foreign keys to link responses to specific assignment instances
-- This ensures each assignment has completely independent responses

ALTER TABLE checklist_responses 
ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES template_assignments(id) ON DELETE CASCADE;

ALTER TABLE checklist_responses 
ADD COLUMN IF NOT EXISTS daily_checklist_id UUID REFERENCES daily_checklists(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_checklist_responses_assignment_id 
ON checklist_responses(assignment_id);

CREATE INDEX IF NOT EXISTS idx_checklist_responses_daily_checklist_id 
ON checklist_responses(daily_checklist_id);

-- Add check constraint: response must belong to either assignment OR daily checklist
ALTER TABLE checklist_responses
ADD CONSTRAINT check_assignment_or_daily 
CHECK (
  (assignment_id IS NOT NULL AND daily_checklist_id IS NULL) OR
  (assignment_id IS NULL AND daily_checklist_id IS NOT NULL)
);

COMMENT ON COLUMN checklist_responses.assignment_id IS 'Links response to specific template assignment instance';
COMMENT ON COLUMN checklist_responses.daily_checklist_id IS 'Links response to specific daily checklist instance';
