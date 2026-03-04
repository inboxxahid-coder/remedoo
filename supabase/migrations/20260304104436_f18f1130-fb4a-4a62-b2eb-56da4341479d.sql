
-- Table for Info Cards Row (My Prescriptions, Lab Reports, My Orders, Favorites)
CREATE TABLE public.dashboard_info_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  icon_name text NOT NULL DEFAULT 'FileText',
  icon_bg text DEFAULT 'bg-primary/10',
  icon_color text DEFAULT 'text-primary',
  path text NOT NULL DEFAULT '/',
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.dashboard_info_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage info cards" ON public.dashboard_info_cards FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public read info cards" ON public.dashboard_info_cards FOR SELECT
  USING (true);

-- Table for Quick Access More grid
CREATE TABLE public.dashboard_quick_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text DEFAULT '',
  extra_text text DEFAULT '',
  icon_name text NOT NULL DEFAULT 'Stethoscope',
  gradient text DEFAULT 'from-primary to-primary/80',
  text_color text DEFAULT 'text-white',
  path text NOT NULL DEFAULT '/',
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.dashboard_quick_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage quick access" ON public.dashboard_quick_access FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public read quick access" ON public.dashboard_quick_access FOR SELECT
  USING (true);

-- Seed default info cards
INSERT INTO public.dashboard_info_cards (label, icon_name, icon_bg, icon_color, path, sort_order) VALUES
('My Prescriptions', 'FileText', 'bg-[hsl(215,60%,92%)]', 'text-primary', '/medical-history', 1),
('Lab Reports', 'Microscope', 'bg-[hsl(200,65%,90%)]', 'text-[hsl(200,65%,40%)]', '/lab-reports', 2),
('My Orders', 'ShoppingBag', 'bg-[hsl(145,50%,90%)]', 'text-[hsl(145,50%,35%)]', '/my-orders', 3),
('Favorites', 'Heart', 'bg-[hsl(0,70%,92%)]', 'text-[hsl(0,70%,50%)]', '/favorites', 4);

-- Seed default quick access items
INSERT INTO public.dashboard_quick_access (title, subtitle, extra_text, icon_name, gradient, text_color, path, sort_order) VALUES
('Find Doctors', '400+ Available', '', 'Stethoscope', 'from-[hsl(215,70%,50%)] to-[hsl(215,65%,40%)]', 'text-white', '/doctors', 1),
('Ambulance Service', '10 min Guaranteed', '₹200', 'Ambulance', 'from-muted to-[hsl(205,30%,94%)]', 'text-foreground', '/emergency', 2),
('Medicine Delivery', 'Fast Home Delivery', '', 'Pill', 'from-[hsl(152,55%,40%)] to-[hsl(152,50%,32%)]', 'text-white', '/pharmacies', 3),
('Health Packages', 'Full Body Checkups', 'Starting From ₹999', 'FlaskConical', 'from-[hsl(270,40%,92%)] to-[hsl(280,35%,88%)]', 'text-foreground', '/labs', 4);

-- Seed default quick actions (primary action grid) if empty
INSERT INTO public.dashboard_quick_actions (label, icon_name, path, gradient, sort_order, active)
SELECT * FROM (VALUES
  ('Book Appointment', 'Calendar', '/doctors', 'from-[hsl(215,70%,50%)] to-[hsl(215,65%,40%)]', 1, true),
  ('Order Medicine', 'ClipboardList', '/pharmacies', 'from-[hsl(152,55%,40%)] to-[hsl(152,50%,32%)]', 2, true),
  ('Lab Tests', 'FlaskConical', '/labs', 'from-[hsl(200,65%,48%)] to-[hsl(200,60%,38%)]', 3, true),
  ('Emergency', 'AlertTriangle', '/emergency', 'from-[hsl(0,70%,52%)] to-[hsl(0,65%,42%)]', 4, true)
) AS v(label, icon_name, path, gradient, sort_order, active)
WHERE NOT EXISTS (SELECT 1 FROM public.dashboard_quick_actions LIMIT 1);
