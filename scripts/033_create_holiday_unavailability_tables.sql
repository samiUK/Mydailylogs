-- Create holidays table for organization-wide holidays
CREATE TABLE IF NOT EXISTS holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create staff_unavailability table for individual staff unavailability
CREATE TABLE IF NOT EXISTS staff_unavailability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create template_schedule_exclusions table to link templates with holidays/unavailability
CREATE TABLE IF NOT EXISTS template_schedule_exclusions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  exclude_holidays BOOLEAN DEFAULT TRUE,
  exclude_weekends BOOLEAN DEFAULT FALSE,
  custom_excluded_dates DATE[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for holidays
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view holidays in their organization" ON holidays
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage holidays" ON holidays
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add RLS policies for staff_unavailability
ALTER TABLE staff_unavailability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view unavailability in their organization" ON staff_unavailability
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage staff unavailability" ON staff_unavailability
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Staff can manage their own unavailability" ON staff_unavailability
  FOR ALL USING (staff_id = auth.uid());

-- Add RLS policies for template_schedule_exclusions
ALTER TABLE template_schedule_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template exclusions in their organization" ON template_schedule_exclusions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage template exclusions" ON template_schedule_exclusions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_holidays_organization_date ON holidays(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_unavailability_staff_dates ON staff_unavailability(staff_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_template_schedule_exclusions_template ON template_schedule_exclusions(template_id);
