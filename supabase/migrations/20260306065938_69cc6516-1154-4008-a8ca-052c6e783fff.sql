
-- Driver locations table for real-time GPS tracking
CREATE TABLE public.driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.ambulance_trips(id) ON DELETE CASCADE NOT NULL,
  driver_user_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_driver_locations_trip ON public.driver_locations(trip_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Driver can insert own locations
CREATE POLICY "Drivers can insert own locations" ON public.driver_locations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = driver_user_id);

-- Driver can view own locations
CREATE POLICY "Drivers can view own locations" ON public.driver_locations
  FOR SELECT TO authenticated
  USING (auth.uid() = driver_user_id);

-- Patient can view locations for their trips
CREATE POLICY "Patients can view trip locations" ON public.driver_locations
  FOR SELECT TO authenticated
  USING (trip_id IN (SELECT id FROM public.ambulance_trips WHERE patient_id = auth.uid()));

-- Hospital admins can view locations for their trips
CREATE POLICY "Hospital admins can view trip locations" ON public.driver_locations
  FOR SELECT TO authenticated
  USING (trip_id IN (SELECT id FROM public.ambulance_trips WHERE hospital_id IN (SELECT id FROM public.hospitals WHERE user_id = auth.uid())));

-- Lab admins can view locations for their trips
CREATE POLICY "Lab admins can view trip locations" ON public.driver_locations
  FOR SELECT TO authenticated
  USING (trip_id IN (SELECT id FROM public.ambulance_trips WHERE lab_id IN (SELECT id FROM public.labs WHERE user_id = auth.uid())));

-- Admins can view all
CREATE POLICY "Admins can view all driver locations" ON public.driver_locations
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for driver_locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;

-- Also add driver_user_id to ambulance_trips for driver panel auth
ALTER TABLE public.ambulance_trips ADD COLUMN IF NOT EXISTS driver_user_id uuid;

-- Policy: drivers can view and update their own trips
CREATE POLICY "Drivers can view own trips" ON public.ambulance_trips
  FOR SELECT TO authenticated
  USING (driver_user_id = auth.uid());

CREATE POLICY "Drivers can update own trips" ON public.ambulance_trips
  FOR UPDATE TO authenticated
  USING (driver_user_id = auth.uid());
