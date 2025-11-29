-- Add 'weekdays' as a new recurrence type option to reduce server load
-- Weekdays-only skips Saturdays and Sundays automatically (28% reduction in daily tasks)

ALTER TABLE checklist_templates 
DROP CONSTRAINT IF EXISTS checklist_templates_recurrence_type_check;

ALTER TABLE checklist_templates
ADD CONSTRAINT checklist_templates_recurrence_type_check 
CHECK (recurrence_type IN ('daily', 'weekdays', 'weekly', 'monthly', 'none'));

COMMENT ON COLUMN checklist_templates.recurrence_type IS 'How often the template assignments recur: daily (all days), weekdays (Mon-Fri only), weekly, monthly, or none';
