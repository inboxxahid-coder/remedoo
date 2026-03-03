-- Create storage bucket for lab reports
INSERT INTO storage.buckets (id, name, public) VALUES ('lab-reports', 'lab-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Lab admins can upload reports
CREATE POLICY "Lab admins can upload reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lab-reports'
  AND EXISTS (
    SELECT 1 FROM labs WHERE user_id = auth.uid()
  )
);

-- Lab admins can update reports
CREATE POLICY "Lab admins can update reports"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'lab-reports'
  AND EXISTS (
    SELECT 1 FROM labs WHERE user_id = auth.uid()
  )
);

-- Patients can download their own reports (path starts with their user_id)
CREATE POLICY "Patients can view own lab reports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lab-reports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can manage all lab reports
CREATE POLICY "Admins can manage lab reports"
ON storage.objects FOR ALL
USING (
  bucket_id = 'lab-reports'
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'lab-reports'
  AND has_role(auth.uid(), 'admin'::app_role)
);