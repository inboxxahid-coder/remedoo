-- Fix lab report upload policy to verify ownership via appointment
DROP POLICY IF EXISTS "Lab admins can upload reports" ON storage.objects;

CREATE POLICY "Lab admins can upload reports for their patients"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lab-reports'
  AND EXISTS (
    SELECT 1 FROM appointments a
    JOIN labs l ON a.lab_id = l.id
    WHERE l.user_id = auth.uid()
    AND a.patient_id::text = (storage.foldername(name))[1]
    AND a.status IN ('confirmed', 'completed')
  )
);