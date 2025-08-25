-- Add soft delete functionality to submitted_reports table
ALTER TABLE submitted_reports 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Create index for better performance on non-deleted reports
CREATE INDEX idx_submitted_reports_not_deleted ON submitted_reports (id) WHERE deleted_at IS NULL;

-- Create index for deleted reports cleanup
CREATE INDEX idx_submitted_reports_deleted ON submitted_reports (deleted_at) WHERE deleted_at IS NOT NULL;

-- Add RLS policy for deleted reports (only master admins can see deleted reports)
CREATE POLICY "Master admins can view deleted reports" ON submitted_reports
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'master_admin'
  )
);
