
-- Add license, GST, and additional document columns to all provider tables

-- Doctors
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS license_url text;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS gst_url text;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS additional_docs_urls text[];

-- Hospitals
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS license_url text;
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS gst_url text;
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS additional_docs_urls text[];

-- Labs
ALTER TABLE public.labs ADD COLUMN IF NOT EXISTS license_url text;
ALTER TABLE public.labs ADD COLUMN IF NOT EXISTS gst_url text;
ALTER TABLE public.labs ADD COLUMN IF NOT EXISTS additional_docs_urls text[];

-- Pharmacies
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS license_url text;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS gst_url text;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS additional_docs_urls text[];

-- Update certificates bucket RLS to allow all providers to upload (already exists but ensure it works)
-- Drop existing policies and recreate for broader provider access
DO $$
BEGIN
  -- Add INSERT policy for all authenticated users on certificates bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Providers can upload certificates' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Providers can upload certificates"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Add SELECT policy for own files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Providers can view own certificates' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Providers can view own certificates"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;
