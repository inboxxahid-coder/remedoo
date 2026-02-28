
-- Add approval_status to provider tables
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.labs ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

-- Add status to profiles for user management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_doctors_approval ON public.doctors(approval_status);
CREATE INDEX IF NOT EXISTS idx_hospitals_approval ON public.hospitals(approval_status);
CREATE INDEX IF NOT EXISTS idx_labs_approval ON public.labs(approval_status);
CREATE INDEX IF NOT EXISTS idx_pharmacies_approval ON public.pharmacies(approval_status);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Allow admins to manage emergency_requests (update status, assign ambulance)
CREATE POLICY "Admins can update emergency requests"
ON public.emergency_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage ambulances
CREATE POLICY "Admins can update ambulances"
ON public.ambulances
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete appointments
CREATE POLICY "Admins can delete appointments"
ON public.appointments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
