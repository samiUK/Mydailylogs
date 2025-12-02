-- Add staff page visibility settings to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS staff_team_page_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS staff_reports_page_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS staff_holidays_page_enabled boolean DEFAULT true;

-- Add comment explaining the columns
COMMENT ON COLUMN organizations.staff_team_page_enabled IS 'Controls whether staff can see the Team page in their navigation';
COMMENT ON COLUMN organizations.staff_reports_page_enabled IS 'Controls whether staff can see the Reports & Analytics page in their navigation';
COMMENT ON COLUMN organizations.staff_holidays_page_enabled IS 'Controls whether staff can manage their holidays in the Profile page';
