
-- Create a public storage bucket for slider images
INSERT INTO storage.buckets (id, name, public) VALUES ('slider-images', 'slider-images', true);

-- Allow anyone to view slider images
CREATE POLICY "Slider images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'slider-images');

-- Allow admins to upload slider images
CREATE POLICY "Admins can upload slider images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'slider-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Allow admins to update slider images
CREATE POLICY "Admins can update slider images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'slider-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Allow admins to delete slider images
CREATE POLICY "Admins can delete slider images"
ON storage.objects FOR DELETE
USING (bucket_id = 'slider-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
