
-- Platform branding table for admin-managed theme customization
CREATE TABLE public.platform_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'logos',
  type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.platform_branding ENABLE ROW LEVEL SECURITY;

-- Anyone can read branding (needed to apply theme across all panels)
CREATE POLICY "Anyone can read branding" ON public.platform_branding FOR SELECT USING (true);

-- Only authenticated admins can update
CREATE POLICY "Admins can update branding" ON public.platform_branding FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert branding" ON public.platform_branding FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_platform_branding_updated_at
  BEFORE UPDATE ON public.platform_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default branding values
INSERT INTO public.platform_branding (key, value, label, category, type) VALUES
  -- Logos
  ('logo_main', '', 'Main App Logo', 'logos', 'image'),
  ('logo_splash', '', 'Splash Screen Logo', 'logos', 'image'),
  ('logo_header', '', 'Header Logo', 'logos', 'image'),
  ('logo_footer', '', 'Footer Logo', 'logos', 'image'),
  ('favicon', '', 'Favicon', 'logos', 'image'),
  -- Colors
  ('color_primary_h', '24', 'Primary Hue', 'colors', 'number'),
  ('color_primary_s', '85', 'Primary Saturation', 'colors', 'number'),
  ('color_primary_l', '50', 'Primary Lightness', 'colors', 'number'),
  ('color_secondary_h', '30', 'Secondary Hue', 'colors', 'number'),
  ('color_secondary_s', '20', 'Secondary Saturation', 'colors', 'number'),
  ('color_secondary_l', '95', 'Secondary Lightness', 'colors', 'number'),
  ('color_background_h', '30', 'Background Hue', 'colors', 'number'),
  ('color_background_s', '15', 'Background Saturation', 'colors', 'number'),
  ('color_background_l', '97', 'Background Lightness', 'colors', 'number'),
  ('color_foreground_h', '20', 'Foreground Hue', 'colors', 'number'),
  ('color_foreground_s', '25', 'Foreground Saturation', 'colors', 'number'),
  ('color_foreground_l', '10', 'Foreground Lightness', 'colors', 'number'),
  -- Graphics
  ('graphic_onboarding_1', '', 'Onboarding Slide 1', 'graphics', 'image'),
  ('graphic_onboarding_2', '', 'Onboarding Slide 2', 'graphics', 'image'),
  ('graphic_onboarding_3', '', 'Onboarding Slide 3', 'graphics', 'image'),
  ('graphic_empty_state', '', 'Empty State Illustration', 'graphics', 'image'),
  ('graphic_error_page', '', 'Error Page Illustration', 'graphics', 'image');

-- Storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true);

-- Storage policies for branding bucket
CREATE POLICY "Anyone can view branding assets" ON storage.objects FOR SELECT USING (bucket_id = 'branding');
CREATE POLICY "Admins can upload branding assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update branding assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete branding assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));
