-- Update checklist_items table to support enhanced task types and validation
ALTER TABLE checklist_items 
ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'boolean',
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS assigned_role text,
ADD COLUMN IF NOT EXISTS validation_rules jsonb DEFAULT '{}';

-- Rename columns to match the form expectations
ALTER TABLE checklist_items 
RENAME COLUMN title TO name;

ALTER TABLE checklist_items 
RENAME COLUMN sort_order TO order_index;

-- Update the template creation form to use the correct table name
-- The form was trying to insert into "checklist_tasks" but the table is "checklist_items"
