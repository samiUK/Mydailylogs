-- Create storage bucket for report photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-photos',
  'report-photos', 
  true,
  307200, -- 300KB limit (provides buffer for various device photo compressions)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
) ON CONFLICT (id) DO UPDATE
SET file_size_limit = 307200;

-- Create RLS policies for the report photos bucket
CREATE POLICY "Users can upload report photos for their organization" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'report-photos' AND 
  auth.uid() IN (
    SELECT profiles.id FROM profiles 
    WHERE profiles.organization_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can view report photos from their organization" ON storage.objects
FOR SELECT USING (
  bucket_id = 'report-photos' AND
  auth.uid() IN (
    SELECT profiles.id FROM profiles 
    WHERE profiles.organization_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can update report photos for their organization" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'report-photos' AND 
  auth.uid() IN (
    SELECT profiles.id FROM profiles 
    WHERE profiles.organization_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can delete report photos for their organization" ON storage.objects
FOR DELETE USING (
  bucket_id = 'report-photos' AND 
  auth.uid() IN (
    SELECT profiles.id FROM profiles 
    WHERE profiles.organization_id::text = (storage.foldername(name))[1]
  )
);
