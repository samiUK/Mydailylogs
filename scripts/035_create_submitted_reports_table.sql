-- Create independent submitted_reports table to preserve business data
-- This table stores completed reports separately from templates to prevent data loss

CREATE TABLE IF NOT EXISTS submitted_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  template_name TEXT NOT NULL, -- Store template name, not reference
  template_description TEXT,
  submitted_by UUID NOT NULL REFERENCES profiles(id),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'completed',
  report_data JSONB NOT NULL, -- Store all checklist responses as JSON
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE submitted_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view submitted reports from their organization" ON submitted_reports
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert submitted reports for their organization" ON submitted_reports
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_submitted_reports_organization_id ON submitted_reports(organization_id);
CREATE INDEX idx_submitted_reports_submitted_by ON submitted_reports(submitted_by);
CREATE INDEX idx_submitted_reports_submitted_at ON submitted_reports(submitted_at);

-- Create function to migrate existing completed checklists to submitted_reports
CREATE OR REPLACE FUNCTION migrate_completed_checklists_to_submitted_reports()
RETURNS void AS $$
BEGIN
  -- Insert completed daily checklists as submitted reports
  INSERT INTO submitted_reports (
    organization_id,
    template_name,
    template_description,
    submitted_by,
    submitted_at,
    status,
    report_data,
    notes
  )
  SELECT 
    dc.organization_id,
    ct.name as template_name,
    ct.description as template_description,
    dc.assigned_to as submitted_by,
    COALESCE(dc.completed_at, dc.updated_at) as submitted_at,
    'completed' as status,
    jsonb_build_object(
      'checklist_id', dc.id,
      'template_id', dc.template_id,
      'date', dc.date,
      'responses', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'item_id', cr.item_id,
            'response_value', cr.response_value,
            'notes', cr.notes,
            'photo_url', cr.photo_url,
            'completed_at', cr.completed_at
          )
        )
        FROM checklist_responses cr
        WHERE cr.checklist_id = dc.id
      )
    ) as report_data,
    dc.notes
  FROM daily_checklists dc
  JOIN checklist_templates ct ON dc.template_id = ct.id
  WHERE dc.status = 'completed'
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Migrated completed checklists to submitted_reports table';
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_completed_checklists_to_submitted_reports();
