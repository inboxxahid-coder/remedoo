
-- Add payment fields to appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'at_clinic',
ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

-- Auto-confirm appointment when payment is completed online
CREATE OR REPLACE FUNCTION public.auto_confirm_paid_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When payment_status changes to 'paid' and payment_method is 'online', auto-confirm
  IF NEW.payment_method = 'online' 
     AND NEW.payment_status = 'paid' 
     AND NEW.status = 'pending'
     AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
    NEW.status := 'confirmed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_confirm_paid_appointment
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_paid_appointment();

-- Also auto-confirm on INSERT if already paid
CREATE OR REPLACE FUNCTION public.auto_confirm_paid_appointment_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payment_method = 'online' AND NEW.payment_status = 'paid' AND NEW.status = 'pending' THEN
    NEW.status := 'confirmed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_confirm_paid_appointment_insert
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_paid_appointment_insert();
