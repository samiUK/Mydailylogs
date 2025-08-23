-- Add RLS policies for daily_checklists table to allow staff to create and manage their own checklists

-- Enable RLS on daily_checklists table (if not already enabled)
ALTER TABLE daily_checklists ENABLE ROW LEVEL SECURITY;

-- Allow staff users to create their own daily checklists
CREATE POLICY "Users can create their own daily checklists" ON daily_checklists
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Allow staff users to read their own daily checklists
CREATE POLICY "Users can read their own daily checklists" ON daily_checklists
  FOR SELECT 
  USING (user_id = auth.uid());

-- Allow staff users to update their own daily checklists
CREATE POLICY "Users can update their own daily checklists" ON daily_checklists
  FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow admins to read all daily checklists
CREATE POLICY "Admins can read all daily checklists" ON daily_checklists
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to update all daily checklists
CREATE POLICY "Admins can update all daily checklists" ON daily_checklists
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to delete daily checklists
CREATE POLICY "Admins can delete daily checklists" ON daily_checklists
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
