
-- Create a trigger function to send push notification on appointment confirmation
CREATE OR REPLACE FUNCTION public.push_notify_appointment_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  provider_name TEXT;
  function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only fire when status changes to 'confirmed'
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'confirmed' THEN
    -- Resolve provider name
    IF NEW.doctor_id IS NOT NULL THEN
      SELECT name INTO provider_name FROM doctors WHERE id = NEW.doctor_id;
    ELSIF NEW.hospital_id IS NOT NULL THEN
      SELECT name INTO provider_name FROM hospitals WHERE id = NEW.hospital_id;
    ELSIF NEW.lab_id IS NOT NULL THEN
      SELECT name INTO provider_name FROM labs WHERE id = NEW.lab_id;
    ELSIF NEW.pharmacy_id IS NOT NULL THEN
      SELECT name INTO provider_name FROM pharmacies WHERE id = NEW.pharmacy_id;
    END IF;

    provider_name := COALESCE(provider_name, 'your provider');

    -- Call the edge function
    function_url := rtrim(current_setting('app.settings.supabase_url', true), '/') || '/functions/v1/send-push-notification';
    service_role_key := current_setting('app.settings.service_role_key', true);

    -- Use pg_net for async HTTP call if available, otherwise use net.http_post
    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'user_id', NEW.patient_id,
        'title', 'Appointment Confirmed ✅',
        'message', 'Your ' || NEW.service_type || ' appointment with ' || provider_name || ' on ' || NEW.appointment_date || ' at ' || NEW.appointment_time || ' has been confirmed.',
        'path', '/appointments'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trigger_push_notify_appointment_confirmed
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.push_notify_appointment_confirmed();
