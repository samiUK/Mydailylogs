-- Create template assignments table
CREATE TABLE IF NOT EXISTS template_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique active assignments per user per template
  UNIQUE(template_id, assigned_to, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Add RLS policies
ALTER TABLE template_assignments ENABLE ROW LEVEL SECURITY;

-- Policy for organization members to view assignments
CREATE POLICY "Users can view template assignments in their organization" ON template_assignments
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy for admins to manage assignments
CREATE POLICY "Admins can manage template assignments" ON template_assignments
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_assignments_template_id ON template_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_template_assignments_assigned_to ON template_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_template_assignments_organization_id ON template_assignments(organization_id);
