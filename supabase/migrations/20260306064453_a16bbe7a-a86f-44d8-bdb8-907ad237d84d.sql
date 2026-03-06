
-- Add pricing_model and night charge fields to hospital_ambulance_config
ALTER TABLE public.hospital_ambulance_config 
  ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'per_km',
  ADD COLUMN IF NOT EXISTS flat_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS night_charge_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS night_charge_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS night_charge_start time DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS night_charge_end time DEFAULT '06:00';

-- Add pricing_model and night charge fields to lab_ambulance_config
ALTER TABLE public.lab_ambulance_config 
  ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'per_km',
  ADD COLUMN IF NOT EXISTS flat_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS night_charge_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS night_charge_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS night_charge_start time DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS night_charge_end time DEFAULT '06:00';

-- Create ambulance_distance_ranges table for both hospitals and labs
CREATE TABLE public.ambulance_distance_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  lab_id uuid REFERENCES public.labs(id) ON DELETE CASCADE,
  min_km numeric NOT NULL DEFAULT 0,
  max_km numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_check CHECK (
    (hospital_id IS NOT NULL AND lab_id IS NULL) OR 
    (hospital_id IS NULL AND lab_id IS NOT NULL)
  )
);

ALTER TABLE public.ambulance_distance_ranges ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage all distance ranges"
  ON public.ambulance_distance_ranges FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Hospital admins can manage own distance ranges"
  ON public.ambulance_distance_ranges FOR ALL
  TO authenticated
  USING (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()))
  WITH CHECK (hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()));

CREATE POLICY "Lab admins can manage own distance ranges"
  ON public.ambulance_distance_ranges FOR ALL
  TO authenticated
  USING (lab_id IN (SELECT id FROM labs WHERE user_id = auth.uid()))
  WITH CHECK (lab_id IN (SELECT id FROM labs WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated can view distance ranges"
  ON public.ambulance_distance_ranges FOR SELECT
  TO authenticated
  USING (true);
