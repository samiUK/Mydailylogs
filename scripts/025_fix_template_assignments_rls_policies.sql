-- Fix RLS policies for template_assignments table to allow staff to update their own assignments

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own template assignments" ON template_assignments;
DROP POLICY IF EXISTS "Users can update their own template assignments" ON template_assignments;
DROP POLICY IF EXISTS "Admins can manage all template assignments" ON template_assignments;

-- Create proper RLS policies for template_assignments
CREATE POLICY "Users can view their own template assignments" ON template_assignments
    FOR SELECT USING (assigned_to = auth.uid());

CREATE POLICY "Users can update their own template assignments" ON template_assignments
    FOR UPDATE USING (assigned_to = auth.uid());

CREATE POLICY "Admins can manage all template assignments" ON template_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Ensure RLS is enabled
ALTER TABLE template_assignments ENABLE ROW LEVEL SECURITY;
