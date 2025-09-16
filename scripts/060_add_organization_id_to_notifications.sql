-- Add organization_id column to notifications table for proper organizational isolation
ALTER TABLE notifications 
ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Update existing notifications to have organization_id based on their associated templates
UPDATE notifications 
SET organization_id = (
  SELECT t.organization_id 
  FROM templates t 
  WHERE t.id = notifications.template_id
)
WHERE template_id IS NOT NULL;

-- Update notifications without template_id based on user's organization
UPDATE notifications 
SET organization_id = (
  SELECT p.organization_id 
  FROM profiles p 
  WHERE p.id = notifications.user_id
)
WHERE template_id IS NULL AND organization_id IS NULL;

-- Add index for better query performance
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);

-- Add not null constraint after updating existing data
ALTER TABLE notifications 
ALTER COLUMN organization_id SET NOT NULL;
