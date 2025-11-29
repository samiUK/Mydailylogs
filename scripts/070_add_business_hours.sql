-- Add business hours to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS business_hours jsonb DEFAULT '{
  "monday": {"enabled": true, "open": "09:00", "close": "17:00"},
  "tuesday": {"enabled": true, "open": "09:00", "close": "17:00"},
  "wednesday": {"enabled": true, "open": "09:00", "close": "17:00"},
  "thursday": {"enabled": true, "open": "09:00", "close": "17:00"},
  "friday": {"enabled": true, "open": "09:00", "close": "17:00"},
  "saturday": {"enabled": false, "open": "09:00", "close": "17:00"},
  "sunday": {"enabled": false, "open": "09:00", "close": "17:00"}
}'::jsonb;

COMMENT ON COLUMN organizations.business_hours IS 'Business operating hours for automated task scheduling';
