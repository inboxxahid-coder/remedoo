-- Step 1: Recreate public views WITHOUT security_invoker (defaults to definer mode)
-- This allows the views to work for anonymous users while base tables are locked down

DROP VIEW IF EXISTS public.hospitals_public;
CREATE VIEW public.hospitals_public AS
SELECT id, name, location, image_url, rating, beds, available_beds, icu_available,
       available_icu_beds, total_beds, total_icu_beds, is_government, latitude, longitude,
       working_hours, holidays, approval_status, created_at
FROM public.hospitals;

DROP VIEW IF EXISTS public.labs_public;
CREATE VIEW public.labs_public AS
SELECT id, name, location, image_url, rating, services, working_hours,
       latitude, longitude, approval_status, created_at
FROM public.labs;

DROP VIEW IF EXISTS public.pharmacies_public;
CREATE VIEW public.pharmacies_public AS
SELECT id, name, location, image_url, rating, working_hours,
       latitude, longitude, approval_status, created_at
FROM public.pharmacies;

DROP VIEW IF EXISTS public.ambulances_public;
CREATE VIEW public.ambulances_public AS
SELECT id, vehicle_number, vehicle_type, status, hospital_id,
       current_latitude, current_longitude, equipment_details, created_at, updated_at
FROM public.ambulances;

-- Recreate doctors_public without security_invoker
DROP VIEW IF EXISTS public.doctors_public;
CREATE VIEW public.doctors_public AS
SELECT id, name, specialization, bio, image_url, experience_years, consultation_fee,
       consultation_duration, rating, working_hours, hospital_id, department_id,
       is_featured, featured_sort_order, vacation_dates, max_appointments_per_day,
       emergency_available, account_status, approval_status, created_at
FROM public.doctors;

-- Step 2: Remove "viewable by everyone" policies from base tables
DROP POLICY IF EXISTS "Doctors are viewable by everyone" ON public.doctors;
DROP POLICY IF EXISTS "Hospitals are viewable by everyone" ON public.hospitals;
DROP POLICY IF EXISTS "Labs are viewable by everyone" ON public.labs;
DROP POLICY IF EXISTS "Ambulances viewable by everyone" ON public.ambulances;

-- Check if pharmacies has a similar policy
DROP POLICY IF EXISTS "Pharmacies are viewable by everyone" ON public.pharmacies;
DROP POLICY IF EXISTS "Pharmacies viewable by everyone" ON public.pharmacies;

-- Step 3: Add authenticated-only SELECT policies to base tables
CREATE POLICY "Authenticated users can view doctors"
ON public.doctors FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view hospitals"
ON public.hospitals FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view labs"
ON public.labs FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view pharmacies"
ON public.pharmacies FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view ambulances"
ON public.ambulances FOR SELECT TO authenticated
USING (true);