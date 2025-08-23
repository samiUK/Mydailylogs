-- Fix the frequency check constraint to allow custom values
-- Drop the existing constraint and recreate it with proper values

ALTER TABLE checklist_templates DROP CONSTRAINT IF EXISTS checklist_templates_frequency_check;

-- Add the constraint back with all valid frequency values
ALTER TABLE checklist_templates ADD CONSTRAINT checklist_templates_frequency_check 
CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom'));

-- Verify the constraint is working
SELECT conname, consrc FROM pg_constraint WHERE conname = 'checklist_templates_frequency_check';
