-- Add RLS policies for checklist_responses table to allow staff to mark tasks as completed

-- Enable RLS on checklist_responses table (if not already enabled)
ALTER TABLE checklist_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to insert their own responses
-- This allows staff members to create responses for tasks assigned to them
CREATE POLICY "Users can insert their own responses" ON checklist_responses
  FOR INSERT 
  WITH CHECK (
    -- Check if the user is assigned to the template that contains this item
    EXISTS (
      SELECT 1 FROM template_assignments ta
      JOIN checklist_items ci ON ci.template_id = ta.template_id
      WHERE ci.id = item_id 
      AND ta.assigned_to = auth.uid()
      AND ta.is_active = true
    )
  );

-- Policy: Allow users to update their own responses
CREATE POLICY "Users can update their own responses" ON checklist_responses
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM template_assignments ta
      JOIN checklist_items ci ON ci.template_id = ta.template_id
      WHERE ci.id = item_id 
      AND ta.assigned_to = auth.uid()
      AND ta.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM template_assignments ta
      JOIN checklist_items ci ON ci.template_id = ta.template_id
      WHERE ci.id = item_id 
      AND ta.assigned_to = auth.uid()
      AND ta.is_active = true
    )
  );

-- Policy: Allow users to read their own responses
CREATE POLICY "Users can read their own responses" ON checklist_responses
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM template_assignments ta
      JOIN checklist_items ci ON ci.template_id = ta.template_id
      WHERE ci.id = item_id 
      AND ta.assigned_to = auth.uid()
      AND ta.is_active = true
    )
  );

-- Policy: Allow admins to read all responses
CREATE POLICY "Admins can read all responses" ON checklist_responses
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy: Allow admins to update all responses
CREATE POLICY "Admins can update all responses" ON checklist_responses
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );
