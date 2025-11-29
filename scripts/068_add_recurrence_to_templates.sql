-- Add recurrence fields to checklist_templates to support automated recurring assignments
ALTER TABLE checklist_templates 
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_type text CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'none'));

-- Update existing templates based on frequency field
UPDATE checklist_templates 
SET is_recurring = true,
    recurrence_type = 
      CASE 
        WHEN frequency = 'daily' THEN 'daily'
        WHEN frequency = 'weekly' THEN 'weekly'
        WHEN frequency = 'monthly' THEN 'monthly'
        ELSE 'none'
      END
WHERE frequency IN ('daily', 'weekly', 'monthly');

UPDATE checklist_templates 
SET is_recurring = false,
    recurrence_type = 'none'
WHERE frequency NOT IN ('daily', 'weekly', 'monthly') OR frequency IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN checklist_templates.is_recurring IS 'Whether this template should automatically create recurring assignments';
COMMENT ON COLUMN checklist_templates.recurrence_type IS 'How often the template assignments recur: daily, weekly, monthly, or none';
