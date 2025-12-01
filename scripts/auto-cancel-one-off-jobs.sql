-- Auto-cancel specific date and deadline jobs after 12:00 PM on the due date
-- This script should be run daily via a cron job

-- Cancel template assignments for specific_date templates that are past their date
UPDATE template_assignments ta
SET 
  is_active = false,
  status = 'cancelled',
  updated_at = NOW()
FROM checklist_templates ct
WHERE 
  ta.template_id = ct.id
  AND ta.is_active = true
  AND ta.status != 'completed'
  AND ct.schedule_type = 'specific_date'
  AND ct.specific_date < CURRENT_DATE;

-- Cancel template assignments for deadline templates that are past their deadline
UPDATE template_assignments ta
SET 
  is_active = false,
  status = 'cancelled',
  updated_at = NOW()
FROM checklist_templates ct
WHERE 
  ta.template_id = ct.id
  AND ta.is_active = true
  AND ta.status != 'completed'
  AND ct.schedule_type = 'deadline'
  AND ct.deadline_date < CURRENT_DATE;

-- Log the cancellations
DO $$
DECLARE
  cancelled_count integer;
BEGIN
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  RAISE NOTICE 'Auto-cancelled % one-off job assignments past their due date/deadline', cancelled_count;
END $$;
