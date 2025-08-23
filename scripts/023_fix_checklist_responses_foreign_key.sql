-- Fix the foreign key constraint issue that's preventing task completion
-- The checklist_responses table has a foreign key constraint on checklist_id
-- that references daily_checklists, but we want to allow responses without
-- requiring a daily_checklist record first

-- Drop the existing foreign key constraint
ALTER TABLE checklist_responses 
DROP CONSTRAINT IF EXISTS checklist_responses_checklist_id_fkey;

-- Make checklist_id nullable so responses can be created without daily_checklists
ALTER TABLE checklist_responses 
ALTER COLUMN checklist_id DROP NOT NULL;

-- Add an index for performance on checklist_id (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_checklist_responses_checklist_id 
ON checklist_responses(checklist_id) WHERE checklist_id IS NOT NULL;

-- Add an index on item_id for better query performance
CREATE INDEX IF NOT EXISTS idx_checklist_responses_item_id 
ON checklist_responses(item_id);
