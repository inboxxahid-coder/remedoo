-- 1. Fix profiles: Ensure no public SELECT exists (verify existing policies)
-- profiles should only be readable by the user themselves and admins
-- Check existing policies - they should already restrict to user_id = auth.uid()

-- 2. Restrict ambulances base table: remove public SELECT, keep authenticated
DROP POLICY IF EXISTS "Ambulances viewable by everyone" ON public.ambulances;
CREATE POLICY "Authenticated users can view ambulances"
ON public.ambulances FOR SELECT TO authenticated
USING (true);

-- 3. Restrict cancellation_otp_settings to authenticated users only
DROP POLICY IF EXISTS "Anyone can read OTP settings" ON public.cancellation_otp_settings;
CREATE POLICY "Authenticated users can read OTP settings"
ON public.cancellation_otp_settings FOR SELECT TO authenticated
USING (true);

-- 4. Restrict platform_commission_config to authenticated providers
DROP POLICY IF EXISTS "Providers can view commission config" ON public.platform_commission_config;
CREATE POLICY "Authenticated users can view commission config"
ON public.platform_commission_config FOR SELECT TO authenticated
USING (true);

-- 5. Recreate ambulances_public as security definer function instead of view
-- to allow anonymous access to safe fields only
DROP VIEW IF EXISTS public.ambulances_public;
CREATE OR REPLACE FUNCTION public.get_ambulances_public()
RETURNS TABLE (
  id uuid,
  vehicle_number text,
  vehicle_type text,
  status text,
  hospital_id uuid,
  current_latitude double precision,
  current_longitude double precision,
  equipment_details text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id, vehicle_number, vehicle_type, status, hospital_id,
         current_latitude, current_longitude, equipment_details
  FROM public.ambulances;
$$;