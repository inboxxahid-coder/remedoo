
-- Add new provider roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'doctor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hospital_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lab_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pharmacy_admin';

-- Add user_id column to doctors table
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add user_id column to hospitals table
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add user_id column to labs table
ALTER TABLE public.labs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add user_id column to pharmacies table
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for user_id lookups
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_user_id ON public.hospitals(user_id);
CREATE INDEX IF NOT EXISTS idx_labs_user_id ON public.labs(user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_user_id ON public.pharmacies(user_id);

-- RLS: Allow providers to view/update their own records
CREATE POLICY "Doctors can view own record" ON public.doctors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Doctors can update own record" ON public.doctors FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Hospital admins can view own record" ON public.hospitals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Hospital admins can update own record" ON public.hospitals FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Lab admins can view own record" ON public.labs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Lab admins can update own record" ON public.labs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Pharmacy admins can view own record" ON public.pharmacies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Pharmacy admins can update own record" ON public.pharmacies FOR UPDATE USING (auth.uid() = user_id);

-- Allow providers to view their own appointments
CREATE POLICY "Doctors can view their appointments" ON public.appointments FOR SELECT USING (
  doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
);
CREATE POLICY "Doctors can update their appointments" ON public.appointments FOR UPDATE USING (
  doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
);

CREATE POLICY "Hospital admins can view their appointments" ON public.appointments FOR SELECT USING (
  hospital_id IN (SELECT id FROM public.hospitals WHERE user_id = auth.uid())
);

CREATE POLICY "Lab admins can view their appointments" ON public.appointments FOR SELECT USING (
  lab_id IN (SELECT id FROM public.labs WHERE user_id = auth.uid())
);

CREATE POLICY "Pharmacy admins can view their appointments" ON public.appointments FOR SELECT USING (
  pharmacy_id IN (SELECT id FROM public.pharmacies WHERE user_id = auth.uid())
);

-- Allow pharmacy admins to view orders for their pharmacy
CREATE POLICY "Pharmacy admins can view their orders" ON public.orders FOR SELECT USING (
  pharmacy_id IN (SELECT id FROM public.pharmacies WHERE user_id = auth.uid())
);
CREATE POLICY "Pharmacy admins can update their orders" ON public.orders FOR UPDATE USING (
  pharmacy_id IN (SELECT id FROM public.pharmacies WHERE user_id = auth.uid())
);

-- Allow pharmacy admins to manage their medicines
CREATE POLICY "Pharmacy admins can view their medicines" ON public.medicines FOR SELECT USING (
  pharmacy_id IN (SELECT id FROM public.pharmacies WHERE user_id = auth.uid())
);
CREATE POLICY "Pharmacy admins can insert medicines" ON public.medicines FOR INSERT WITH CHECK (
  pharmacy_id IN (SELECT id FROM public.pharmacies WHERE user_id = auth.uid())
);
CREATE POLICY "Pharmacy admins can update their medicines" ON public.medicines FOR UPDATE USING (
  pharmacy_id IN (SELECT id FROM public.pharmacies WHERE user_id = auth.uid())
);
CREATE POLICY "Pharmacy admins can delete their medicines" ON public.medicines FOR DELETE USING (
  pharmacy_id IN (SELECT id FROM public.pharmacies WHERE user_id = auth.uid())
);
