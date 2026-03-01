
-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  doctor_id uuid REFERENCES public.doctors(id) NOT NULL,
  patient_id uuid NOT NULL,
  diagnosis text,
  notes text,
  signature_data text, -- base64 e-signature
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create prescription items (medicines)
CREATE TABLE public.prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid REFERENCES public.prescriptions(id) ON DELETE CASCADE NOT NULL,
  medicine_name text NOT NULL,
  generic_name text,
  dosage text NOT NULL,
  frequency text NOT NULL,
  duration text NOT NULL,
  instructions text,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

-- Prescriptions RLS
CREATE POLICY "Doctors can insert own prescriptions"
ON public.prescriptions FOR INSERT
WITH CHECK (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can update own prescriptions"
ON public.prescriptions FOR UPDATE
USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can view own prescriptions"
ON public.prescriptions FOR SELECT
USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can delete own prescriptions"
ON public.prescriptions FOR DELETE
USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Patients can view own prescriptions"
ON public.prescriptions FOR SELECT
USING (auth.uid() = patient_id);

CREATE POLICY "Admins can view all prescriptions"
ON public.prescriptions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Prescription items RLS
CREATE POLICY "Doctors can manage own prescription items"
ON public.prescription_items FOR ALL
USING (prescription_id IN (
  SELECT id FROM prescriptions WHERE doctor_id IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()
  )
))
WITH CHECK (prescription_id IN (
  SELECT id FROM prescriptions WHERE doctor_id IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Patients can view own prescription items"
ON public.prescription_items FOR SELECT
USING (prescription_id IN (
  SELECT id FROM prescriptions WHERE patient_id = auth.uid()
));

CREATE POLICY "Admins can view all prescription items"
ON public.prescription_items FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Timestamps trigger
CREATE TRIGGER update_prescriptions_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
