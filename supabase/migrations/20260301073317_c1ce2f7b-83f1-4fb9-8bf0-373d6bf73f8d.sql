
-- Trigger: auto-decrease available_beds when emergency is resolved (patient admitted)
CREATE OR REPLACE FUNCTION public.sync_beds_on_emergency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  amb_hospital_id uuid;
BEGIN
  -- When emergency status changes to 'resolved' (admitted), decrease available beds
  IF NEW.status = 'resolved' AND (OLD.status IS DISTINCT FROM 'resolved') THEN
    -- Find hospital via assigned ambulance
    IF NEW.assigned_ambulance_id IS NOT NULL THEN
      SELECT hospital_id INTO amb_hospital_id FROM ambulances WHERE id = NEW.assigned_ambulance_id;
    END IF;

    IF amb_hospital_id IS NOT NULL THEN
      UPDATE hospitals
      SET available_beds = GREATEST(available_beds - 1, 0)
      WHERE id = amb_hospital_id AND available_beds > 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_beds_on_emergency
BEFORE UPDATE ON public.emergency_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_beds_on_emergency();
