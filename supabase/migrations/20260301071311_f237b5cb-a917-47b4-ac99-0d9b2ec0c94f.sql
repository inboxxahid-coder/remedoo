
-- Add detailed bed tracking columns to hospitals
ALTER TABLE public.hospitals 
ADD COLUMN IF NOT EXISTS total_beds integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_beds integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_icu_beds integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_icu_beds integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS emergency_contact text,
ADD COLUMN IF NOT EXISTS platform_commission_percent numeric DEFAULT 10;

-- Departments table
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  head_doctor_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital admins can manage own departments" ON public.departments FOR ALL
  USING (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()))
  WITH CHECK (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all departments" ON public.departments FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Departments viewable by everyone" ON public.departments FOR SELECT USING (true);

-- Operation theaters table
CREATE TABLE public.operation_theaters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'available',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operation_theaters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital admins can manage own OTs" ON public.operation_theaters FOR ALL
  USING (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()))
  WITH CHECK (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all OTs" ON public.operation_theaters FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "OTs viewable by everyone" ON public.operation_theaters FOR SELECT USING (true);

-- Equipment table
CREATE TABLE public.hospital_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'operational',
  maintenance_notes text,
  last_maintenance_date date,
  next_maintenance_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hospital_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital admins can manage own equipment" ON public.hospital_equipment FOR ALL
  USING (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()))
  WITH CHECK (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all equipment" ON public.hospital_equipment FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Hospital earnings table
CREATE TABLE public.hospital_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  platform_commission numeric NOT NULL DEFAULT 0,
  net_earning numeric NOT NULL DEFAULT 0,
  description text,
  type text NOT NULL DEFAULT 'appointment',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hospital_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital admins can view own earnings" ON public.hospital_earnings FOR SELECT
  USING (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all earnings" ON public.hospital_earnings FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert earnings" ON public.hospital_earnings FOR INSERT
  WITH CHECK (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()));

-- Add department_id to doctors for department association
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

-- Add department to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS department text;

-- Enable realtime for bed tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.operation_theaters;

-- Triggers for updated_at
CREATE TRIGGER update_operation_theaters_updated_at BEFORE UPDATE ON public.operation_theaters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hospital_equipment_updated_at BEFORE UPDATE ON public.hospital_equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
