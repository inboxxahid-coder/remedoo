-- Recreate views with security_invoker = true (Supabase best practice)
DROP VIEW IF EXISTS public.hospitals_public;
CREATE VIEW public.hospitals_public WITH (security_invoker = true) AS
SELECT id, name, location, image_url, rating, beds, available_beds, icu_available,
       available_icu_beds, total_beds, total_icu_beds, is_government, latitude, longitude,
       working_hours, holidays, approval_status, created_at
FROM public.hospitals;

DROP VIEW IF EXISTS public.labs_public;
CREATE VIEW public.labs_public WITH (security_invoker = true) AS
SELECT id, name, location, image_url, rating, services, working_hours,
       latitude, longitude, approval_status, created_at
FROM public.labs;

DROP VIEW IF EXISTS public.pharmacies_public;
CREATE VIEW public.pharmacies_public WITH (security_invoker = true) AS
SELECT id, name, location, image_url, rating, working_hours,
       latitude, longitude, approval_status, created_at
FROM public.pharmacies;

DROP VIEW IF EXISTS public.ambulances_public;
CREATE VIEW public.ambulances_public WITH (security_invoker = true) AS
SELECT id, vehicle_number, vehicle_type, status, hospital_id,
       current_latitude, current_longitude, equipment_details, created_at, updated_at
FROM public.ambulances;

DROP VIEW IF EXISTS public.doctors_public;
CREATE VIEW public.doctors_public WITH (security_invoker = true) AS
SELECT id, name, specialization, bio, image_url, experience_years, consultation_fee,
       consultation_duration, rating, working_hours, hospital_id, department_id,
       is_featured, featured_sort_order, vacation_dates, max_appointments_per_day,
       emergency_available, account_status, approval_status, created_at
FROM public.doctors;

-- Restore "viewable by everyone" on base tables (needed for views with security_invoker)
-- The authenticated-only policies already exist from previous migration, drop them first
DROP POLICY IF EXISTS "Authenticated users can view doctors" ON public.doctors;
DROP POLICY IF EXISTS "Authenticated users can view hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Authenticated users can view labs" ON public.labs;
DROP POLICY IF EXISTS "Authenticated users can view pharmacies" ON public.pharmacies;
DROP POLICY IF EXISTS "Authenticated users can view ambulances" ON public.ambulances;

CREATE POLICY "Doctors are viewable by everyone"
ON public.doctors FOR SELECT USING (true);

CREATE POLICY "Hospitals are viewable by everyone"
ON public.hospitals FOR SELECT USING (true);

CREATE POLICY "Labs are viewable by everyone"
ON public.labs FOR SELECT USING (true);

CREATE POLICY "Pharmacies are viewable by everyone"
ON public.pharmacies FOR SELECT USING (true);

CREATE POLICY "Ambulances viewable by everyone"
ON public.ambulances FOR SELECT USING (true);