
-- Lab ambulance config table (mirrors hospital_ambulance_config)
CREATE TABLE public.lab_ambulance_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE UNIQUE,
  service_enabled boolean DEFAULT false,
  service_type text NOT NULL DEFAULT 'free',
  base_fare numeric DEFAULT 0,
  per_km_charge numeric DEFAULT 0,
  emergency_surcharge numeric DEFAULT 0,
  night_surcharge numeric DEFAULT 0,
  minimum_charge numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_ambulance_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all lab ambulance configs" ON public.lab_ambulance_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Lab admins can manage own ambulance config" ON public.lab_ambulance_config FOR ALL TO authenticated
  USING (lab_id IN (SELECT id FROM public.labs WHERE user_id = auth.uid()))
  WITH CHECK (lab_id IN (SELECT id FROM public.labs WHERE user_id = auth.uid()));

-- Add lab_id to ambulances table so labs can also own ambulances
ALTER TABLE public.ambulances ADD COLUMN IF NOT EXISTS lab_id uuid REFERENCES public.labs(id) ON DELETE SET NULL;

-- Allow lab admins to manage their own ambulances
CREATE POLICY "Lab admins can manage own ambulances" ON public.ambulances FOR ALL TO authenticated
  USING (lab_id IN (SELECT id FROM public.labs WHERE user_id = auth.uid()))
  WITH CHECK (lab_id IN (SELECT id FROM public.labs WHERE user_id = auth.uid()));

-- Add lab_id to ambulance_trips so labs can have trips
ALTER TABLE public.ambulance_trips ADD COLUMN IF NOT EXISTS lab_id uuid REFERENCES public.labs(id) ON DELETE SET NULL;

-- Make hospital_id nullable since labs can also have trips
ALTER TABLE public.ambulance_trips ALTER COLUMN hospital_id DROP NOT NULL;

-- Allow lab admins to manage their own trips
CREATE POLICY "Lab admins can manage own trips" ON public.ambulance_trips FOR ALL TO authenticated
  USING (lab_id IN (SELECT id FROM public.labs WHERE user_id = auth.uid()))
  WITH CHECK (lab_id IN (SELECT id FROM public.labs WHERE user_id = auth.uid()));
