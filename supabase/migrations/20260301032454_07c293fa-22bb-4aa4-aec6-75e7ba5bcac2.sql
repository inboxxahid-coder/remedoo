
-- =============================================
-- 1. ADD COLUMNS TO DOCTORS TABLE
-- =============================================
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS experience_years integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_appointments_per_day integer DEFAULT 20,
  ADD COLUMN IF NOT EXISTS consultation_duration integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS emergency_available boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificate_url text,
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

-- =============================================
-- 2. ADD COLUMNS TO APPOINTMENTS TABLE
-- =============================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS consultation_notes text,
  ADD COLUMN IF NOT EXISTS prescription_url text,
  ADD COLUMN IF NOT EXISTS follow_up_date date,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- =============================================
-- 3. CREATE AUDIT LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  doctor_id uuid REFERENCES public.doctors(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Doctors can view their own logs
CREATE POLICY "Doctors can view own audit logs"
  ON public.audit_logs FOR SELECT
  USING (user_id = auth.uid());

-- Doctors can insert their own logs
CREATE POLICY "Doctors can insert own audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can view all logs
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 4. CREATE DOCTOR BLOCKED SLOTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.doctor_blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  start_time time,
  end_time time,
  reason text,
  is_full_day boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_blocked_slots ENABLE ROW LEVEL SECURITY;

-- Doctors can manage their own blocked slots
CREATE POLICY "Doctors can view own blocked slots"
  ON public.doctor_blocked_slots FOR SELECT
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can insert own blocked slots"
  ON public.doctor_blocked_slots FOR INSERT
  WITH CHECK (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can update own blocked slots"
  ON public.doctor_blocked_slots FOR UPDATE
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can delete own blocked slots"
  ON public.doctor_blocked_slots FOR DELETE
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Admins can manage all blocked slots
CREATE POLICY "Admins can manage all blocked slots"
  ON public.doctor_blocked_slots FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 5. CREATE STORAGE BUCKET FOR PRESCRIPTIONS IF NOT EXISTS
-- =============================================
-- prescriptions bucket already exists

-- Create certificates bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for certificates bucket
CREATE POLICY "Doctors can upload own certificates"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Doctors can view own certificates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Doctors can update own certificates"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all certificates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certificates' AND has_role(auth.uid(), 'admin'::app_role));

-- Prescription upload policy for doctors
CREATE POLICY "Doctors can upload prescriptions"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Doctors can view prescriptions they uploaded"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- 6. INDEX FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_doctor_id ON public.audit_logs(doctor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON public.appointments(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_doctor_blocked_slots_doctor_date ON public.doctor_blocked_slots(doctor_id, blocked_date);
