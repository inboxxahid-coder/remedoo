INSERT INTO storage.buckets (id, name, public) VALUES ('medicine-images', 'medicine-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read medicine images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'medicine-images');
CREATE POLICY "Admin upload medicine images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'medicine-images');
CREATE POLICY "Admin update medicine images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'medicine-images');
