
-- Admin team members table for managing admin users with designations
CREATE TABLE public.admin_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  designation text NOT NULL DEFAULT 'Admin',
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_team ENABLE ROW LEVEL SECURITY;

-- Only admins can manage admin team
CREATE POLICY "Admins can manage admin team"
  ON public.admin_team FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Platform settings table
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  label text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  type text NOT NULL DEFAULT 'text',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform settings"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default settings
INSERT INTO public.platform_settings (key, value, label, category, type) VALUES
  ('platform_name', 'Remedoo', 'Platform Name', 'general', 'text'),
  ('support_email', 'support@remedoo.com', 'Support Email', 'general', 'text'),
  ('support_phone', '+91 9876543210', 'Support Phone', 'general', 'text'),
  ('maintenance_mode', 'false', 'Maintenance Mode', 'general', 'toggle'),
  ('new_registrations', 'true', 'Allow New Registrations', 'general', 'toggle'),
  ('default_commission', '10', 'Default Commission (%)', 'finance', 'number'),
  ('min_order_amount', '100', 'Minimum Order Amount (₹)', 'finance', 'number'),
  ('delivery_fee', '40', 'Delivery Fee (₹)', 'finance', 'number'),
  ('free_delivery_above', '500', 'Free Delivery Above (₹)', 'finance', 'number'),
  ('max_appointments_per_day', '50', 'Max Appointments/Day', 'appointments', 'number'),
  ('appointment_buffer_minutes', '15', 'Appointment Buffer (min)', 'appointments', 'number'),
  ('auto_cancel_hours', '24', 'Auto-Cancel Pending After (hrs)', 'appointments', 'number'),
  ('emergency_radius_km', '25', 'Emergency Search Radius (km)', 'emergency', 'number'),
  ('ambulance_timeout_minutes', '30', 'Ambulance Timeout (min)', 'emergency', 'number'),
  ('terms_url', '', 'Terms & Conditions URL', 'legal', 'text'),
  ('privacy_url', '', 'Privacy Policy URL', 'legal', 'text'),
  ('refund_policy_url', '', 'Refund Policy URL', 'legal', 'text');

-- Updated_at trigger
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_team_updated_at
  BEFORE UPDATE ON public.admin_team
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
