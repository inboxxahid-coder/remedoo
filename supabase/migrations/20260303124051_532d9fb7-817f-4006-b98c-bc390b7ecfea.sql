-- 1. Create public views that hide PII for hospitals, labs, pharmacies, ambulances

-- Hospitals public view (hides phone, emergency_contact, platform_commission_percent)
CREATE OR REPLACE VIEW public.hospitals_public WITH (security_invoker = true) AS
SELECT id, name, location, image_url, rating, beds, available_beds, icu_available,
       available_icu_beds, total_beds, total_icu_beds, is_government, latitude, longitude,
       working_hours, holidays, approval_status, created_at
FROM public.hospitals;

-- Labs public view (hides phone)
CREATE OR REPLACE VIEW public.labs_public WITH (security_invoker = true) AS
SELECT id, name, location, image_url, rating, services, working_hours,
       latitude, longitude, approval_status, created_at
FROM public.labs;

-- Pharmacies public view (hides phone)
CREATE OR REPLACE VIEW public.pharmacies_public WITH (security_invoker = true) AS
SELECT id, name, location, image_url, rating, working_hours,
       latitude, longitude, approval_status, created_at
FROM public.pharmacies;

-- Ambulances public view (hides driver_name, driver_phone, assigned_patient_id)
CREATE OR REPLACE VIEW public.ambulances_public WITH (security_invoker = true) AS
SELECT id, vehicle_number, vehicle_type, status, hospital_id,
       current_latitude, current_longitude, equipment_details, created_at, updated_at
FROM public.ambulances;

-- 2. Add RLS policies to rate_limits table (admin only)
CREATE POLICY "Only admins can access rate limits"
ON public.rate_limits FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Ensure profiles table doesn't have public SELECT - verify existing policies
-- profiles already has user-specific and admin policies, no public SELECT exists
-- No changes needed for profiles RLS