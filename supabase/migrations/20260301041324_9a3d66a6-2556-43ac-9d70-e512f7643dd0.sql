
-- Add token_number to appointments for queue management
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS token_number integer;

-- Create a function to auto-assign token numbers per doctor per day
CREATE OR REPLACE FUNCTION public.assign_token_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_token integer;
BEGIN
  -- Only assign token when status changes to confirmed
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') AND NEW.token_number IS NULL THEN
    SELECT COALESCE(MAX(token_number), 0) + 1 INTO next_token
    FROM public.appointments
    WHERE doctor_id = NEW.doctor_id
      AND appointment_date = NEW.appointment_date
      AND status IN ('confirmed', 'completed')
      AND token_number IS NOT NULL;
    
    NEW.token_number := next_token;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto token assignment
DROP TRIGGER IF EXISTS assign_appointment_token ON public.appointments;
CREATE TRIGGER assign_appointment_token
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_token_number();

-- Also handle insert with confirmed status
DROP TRIGGER IF EXISTS assign_appointment_token_insert ON public.appointments;
CREATE TRIGGER assign_appointment_token_insert
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_token_number();

-- Enable realtime for appointments so patients see live queue updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
