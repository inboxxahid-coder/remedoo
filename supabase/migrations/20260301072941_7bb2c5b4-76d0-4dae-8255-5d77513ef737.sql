
-- Hospital Ambulance Service Configuration
CREATE TABLE public.hospital_ambulance_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL UNIQUE,
  service_enabled boolean DEFAULT false,
  service_type text NOT NULL DEFAULT 'free', -- free, paid, conditional
  base_fare numeric DEFAULT 0,
  per_km_charge numeric DEFAULT 0,
  emergency_surcharge numeric DEFAULT 0,
  night_surcharge numeric DEFAULT 0,
  minimum_charge numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hospital_ambulance_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all ambulance configs"
ON public.hospital_ambulance_config FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Hospital admins can manage own ambulance config"
ON public.hospital_ambulance_config FOR ALL
USING (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()))
WITH CHECK (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()));

CREATE TRIGGER update_hospital_ambulance_config_updated_at
BEFORE UPDATE ON public.hospital_ambulance_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enhance ambulances table with hospital linkage
ALTER TABLE public.ambulances 
ADD COLUMN IF NOT EXISTS hospital_id uuid REFERENCES public.hospitals(id),
ADD COLUMN IF NOT EXISTS vehicle_type text DEFAULT 'BLS',
ADD COLUMN IF NOT EXISTS equipment_details text;

-- Allow hospital admins to manage their ambulances
CREATE POLICY "Hospital admins can manage own ambulances"
ON public.ambulances FOR ALL
USING (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()))
WITH CHECK (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()));

CREATE POLICY "Hospital admins can insert ambulances"
ON public.ambulances FOR INSERT
WITH CHECK (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()));

-- Ambulance Trips table
CREATE TABLE public.ambulance_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL,
  ambulance_id uuid REFERENCES public.ambulances(id),
  emergency_request_id uuid REFERENCES public.emergency_requests(id),
  patient_id uuid NOT NULL,
  driver_name text,
  driver_phone text,
  status text NOT NULL DEFAULT 'assigned',
  distance_km numeric DEFAULT 0,
  base_fare numeric DEFAULT 0,
  distance_fare numeric DEFAULT 0,
  surcharge numeric DEFAULT 0,
  total_fare numeric DEFAULT 0,
  is_free boolean DEFAULT false,
  payment_method text DEFAULT 'cash',
  payment_status text DEFAULT 'pending',
  started_at timestamptz,
  reached_at timestamptz,
  completed_at timestamptz,
  response_time_minutes numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ambulance_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all ambulance trips"
ON public.ambulance_trips FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Hospital admins can manage own trips"
ON public.ambulance_trips FOR ALL
USING (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()))
WITH CHECK (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()));

CREATE POLICY "Patients can view own trips"
ON public.ambulance_trips FOR SELECT
USING (auth.uid() = patient_id);

CREATE TRIGGER update_ambulance_trips_updated_at
BEFORE UPDATE ON public.ambulance_trips
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
