-- Remove the frequency check constraint that's preventing template creation
-- We'll handle frequency validation in the application code instead

ALTER TABLE checklist_templates 
DROP CONSTRAINT IF EXISTS checklist_templates_frequency_check;

-- Add a comment to document this change
COMMENT ON COLUMN checklist_templates.frequency IS 'Frequency of template execution - validation handled in application code';
