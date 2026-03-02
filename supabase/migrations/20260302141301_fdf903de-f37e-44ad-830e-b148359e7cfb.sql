
-- Dashboard Quick Actions (configurable from admin)
CREATE TABLE public.dashboard_quick_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  icon_name text NOT NULL DEFAULT 'Calendar',
  emoji text,
  gradient text DEFAULT 'from-primary to-[hsl(190,70%,45%)]',
  path text NOT NULL DEFAULT '/',
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.dashboard_quick_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read quick actions" ON public.dashboard_quick_actions FOR SELECT USING (true);
CREATE POLICY "Admins manage quick actions" ON public.dashboard_quick_actions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Dashboard Services (Browse Services section)
CREATE TABLE public.dashboard_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  icon_name text NOT NULL DEFAULT 'Stethoscope',
  path text NOT NULL DEFAULT '/',
  color text DEFAULT 'text-primary',
  bg_color text DEFAULT 'bg-primary/10',
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.dashboard_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read services" ON public.dashboard_services FOR SELECT USING (true);
CREATE POLICY "Admins manage services" ON public.dashboard_services FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Dashboard Health Tips
CREATE TABLE public.dashboard_health_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  icon_name text NOT NULL DEFAULT 'Heart',
  color text DEFAULT 'text-primary',
  bg_color text DEFAULT 'bg-primary/10',
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.dashboard_health_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read health tips" ON public.dashboard_health_tips FOR SELECT USING (true);
CREATE POLICY "Admins manage health tips" ON public.dashboard_health_tips FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add featured flags to doctors and medicines
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS featured_sort_order integer DEFAULT 0;

ALTER TABLE public.medicines ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE public.medicines ADD COLUMN IF NOT EXISTS featured_sort_order integer DEFAULT 0;

-- Seed default quick actions
INSERT INTO public.dashboard_quick_actions (label, icon_name, emoji, gradient, path, sort_order) VALUES
  ('Book\nAppointment', 'Calendar', '📅', 'from-primary to-[hsl(190,70%,45%)]', '/doctors', 1),
  ('Emergency\nSOS', 'AlertTriangle', '🚨', 'from-emergency to-[hsl(15,80%,50%)]', '/emergency', 2),
  ('Order\nMedicines', 'Pill', '💊', 'from-success to-[hsl(160,55%,48%)]', '/pharmacies', 3),
  ('Favorites', 'Heart', '❤️', 'from-warning to-[hsl(25,90%,55%)]', '/favorites', 4);

-- Seed default services
INSERT INTO public.dashboard_services (title, description, icon_name, path, color, bg_color, sort_order) VALUES
  ('Doctors', 'Find specialists', 'Stethoscope', '/doctors', 'text-primary', 'bg-primary/10', 1),
  ('Hospitals', 'Nearby facilities', 'Building2', '/hospitals', 'text-emergency', 'bg-emergency/10', 2),
  ('Labs', 'Book tests', 'FlaskConical', '/labs', 'text-success', 'bg-success/10', 3),
  ('Pharmacies', 'Order medicines', 'Store', '/pharmacies', 'text-warning', 'bg-warning/10', 4);

-- Seed default health tips
INSERT INTO public.dashboard_health_tips (title, description, icon_name, color, bg_color, sort_order) VALUES
  ('Stay Hydrated', 'Drink 8+ glasses of water daily for optimal organ function.', 'Droplets', 'text-blue-500', 'bg-blue-500/10', 1),
  ('Quality Sleep', '7-9 hours of sleep improves immunity and cognitive function.', 'Moon', 'text-violet-500', 'bg-violet-500/10', 2),
  ('Balanced Diet', 'Include fruits, vegetables, and whole grains in every meal.', 'Apple', 'text-success', 'bg-success/10', 3),
  ('Stay Active', '30 minutes of daily exercise reduces heart disease risk by 35%.', 'Dumbbell', 'text-warning', 'bg-warning/10', 4),
  ('Mental Health', 'Practice mindfulness or meditation for 10 minutes daily.', 'Brain', 'text-primary', 'bg-primary/10', 5),
  ('Vitamin D', '15 minutes of morning sunlight boosts bone health and mood.', 'Sun', 'text-amber-500', 'bg-amber-500/10', 6),
  ('Heart Health', 'Regular checkups help detect cardiovascular issues early.', 'Heart', 'text-emergency', 'bg-emergency/10', 7),
  ('Deep Breathing', 'Practice 4-7-8 breathing technique to reduce stress and anxiety.', 'Wind', 'text-teal-500', 'bg-teal-500/10', 8);
