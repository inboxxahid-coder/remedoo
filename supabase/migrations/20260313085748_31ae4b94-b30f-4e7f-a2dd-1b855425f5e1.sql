
-- Add Authentication & Session settings
INSERT INTO platform_settings (key, value, label, category, type) VALUES
  ('single_session_enabled', 'false', 'Enforce Single Session Login', 'authentication', 'toggle'),
  ('session_timeout_minutes', '1440', 'Session Timeout (minutes)', 'authentication', 'number'),
  ('force_logout_on_password_change', 'true', 'Force Logout on Password Change', 'authentication', 'toggle'),
  ('max_login_attempts', '5', 'Max Login Attempts Before Lockout', 'authentication', 'number'),
  ('lockout_duration_minutes', '30', 'Lockout Duration (minutes)', 'authentication', 'number'),
  ('provider_email_verification', 'true', 'Require Email Verification for Providers', 'registration', 'toggle'),
  ('provider_auto_approval', 'false', 'Auto-Approve Provider Registrations', 'registration', 'toggle'),
  ('allow_doctor_registration', 'true', 'Allow Doctor Registration', 'registration', 'toggle'),
  ('allow_hospital_registration', 'true', 'Allow Hospital Registration', 'registration', 'toggle'),
  ('allow_lab_registration', 'true', 'Allow Lab Registration', 'registration', 'toggle'),
  ('allow_pharmacy_registration', 'true', 'Allow Pharmacy Registration', 'registration', 'toggle'),
  ('patient_signup_enabled', 'true', 'Allow Patient Signup', 'registration', 'toggle')
ON CONFLICT (key) DO NOTHING;

-- Create active_sessions table for session management
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  device_info text,
  ip_address text,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Admins can view all sessions
CREATE POLICY "Admins can manage sessions" ON public.active_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions" ON public.active_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
