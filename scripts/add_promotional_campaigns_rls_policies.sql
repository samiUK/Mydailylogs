-- Add Row Level Security policies for promotional_campaigns table

-- Enable RLS on the table (if not already enabled)
ALTER TABLE promotional_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: Allow master admin to insert campaigns
CREATE POLICY "Master admin can insert campaigns"
ON promotional_campaigns
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'master_admin'
  )
);

-- Policy: Allow master admin to select campaigns
CREATE POLICY "Master admin can view campaigns"
ON promotional_campaigns
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'master_admin'
  )
);

-- Policy: Allow master admin to update campaigns
CREATE POLICY "Master admin can update campaigns"
ON promotional_campaigns
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'master_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'master_admin'
  )
);

-- Policy: Allow master admin to delete campaigns
CREATE POLICY "Master admin can delete campaigns"
ON promotional_campaigns
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'master_admin'
  )
);

-- Policy: Allow public read access to active campaigns (for banner display)
CREATE POLICY "Public can view active campaigns"
ON promotional_campaigns
FOR SELECT
TO anon, authenticated
USING (is_active = true);
