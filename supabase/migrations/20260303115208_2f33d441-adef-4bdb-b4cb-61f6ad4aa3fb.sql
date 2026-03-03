
-- Fix the view to use SECURITY INVOKER (safe)
DROP VIEW IF EXISTS public.doctors_public;
CREATE VIEW public.doctors_public
WITH (security_invoker = true)
AS
SELECT 
  id, name, specialization, bio, consultation_fee, consultation_duration,
  experience_years, hospital_id, department_id, image_url, rating,
  working_hours, is_featured, featured_sort_order, emergency_available,
  max_appointments_per_day, approval_status, account_status, created_at,
  vacation_dates
FROM public.doctors;
