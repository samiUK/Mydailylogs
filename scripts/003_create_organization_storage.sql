-- Create storage bucket for organization assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('organization-assets', 'organization-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for organization assets
CREATE POLICY "Organization members can upload assets" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'organization-assets' AND
  auth.uid() IN (
    SELECT profiles.id FROM profiles 
    WHERE profiles.organization_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Organization assets are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'organization-assets');

CREATE POLICY "Organization members can update their assets" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'organization-assets' AND
  auth.uid() IN (
    SELECT profiles.id FROM profiles 
    WHERE profiles.organization_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Organization members can delete their assets" ON storage.objects
FOR DELETE USING (
  bucket_id = 'organization-assets' AND
  auth.uid() IN (
    SELECT profiles.id FROM profiles 
    WHERE profiles.organization_id::text = (storage.foldername(name))[1]
  )
);
