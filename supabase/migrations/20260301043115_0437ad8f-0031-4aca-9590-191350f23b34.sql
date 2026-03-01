
-- Table to track consultation note edit requests and history
CREATE TABLE public.consultation_edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id),
  requested_by uuid NOT NULL,
  field_name text NOT NULL DEFAULT 'consultation_notes',
  old_value text,
  new_value text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.consultation_edit_requests ENABLE ROW LEVEL SECURITY;

-- Doctors can create edit requests for their own appointments
CREATE POLICY "Doctors can insert own edit requests"
ON public.consultation_edit_requests FOR INSERT
WITH CHECK (
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
);

-- Doctors can view their own edit requests
CREATE POLICY "Doctors can view own edit requests"
ON public.consultation_edit_requests FOR SELECT
USING (
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
);

-- Admins can view all edit requests
CREATE POLICY "Admins can view all edit requests"
ON public.consultation_edit_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update edit requests (approve/reject)
CREATE POLICY "Admins can update edit requests"
ON public.consultation_edit_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Add lock_hours setting: appointments are locked X hours after completion
-- We'll use 24 hours as default, stored in the appointments completed_at timestamp
-- Add completed_at column to track exact completion time
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Enable realtime for edit requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_edit_requests;
