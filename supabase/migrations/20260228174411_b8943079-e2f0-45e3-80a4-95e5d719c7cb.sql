
CREATE OR REPLACE FUNCTION public.push_notify_appointment_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  provider_name TEXT;
  notif_title TEXT;
  notif_message TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('confirmed', 'cancelled', 'completed') THEN
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

    notif_title := CASE NEW.status
      WHEN 'confirmed' THEN 'Appointment Confirmed ✅'
      WHEN 'cancelled' THEN 'Appointment Cancelled ❌'
      WHEN 'completed' THEN 'Appointment Completed 🎉'
    END;
    notif_message := 'Your ' || NEW.service_type || ' appointment with ' || provider_name || ' on ' || NEW.appointment_date || ' at ' || NEW.appointment_time || ' has been ' || NEW.status || '.';

    PERFORM net.http_post(
      url := 'https://suicqpfijnsortcszqep.supabase.co/functions/v1/send-push-notification',
      body := jsonb_build_object(
        'user_id', NEW.patient_id,
        'title', notif_title,
        'message', notif_message,
        'path', '/appointments'
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1aWNxcGZpam5zb3J0Y3N6cWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDc4MjQsImV4cCI6MjA4Nzc4MzgyNH0.teNIccPIhtIoPmAHd9OtNHi0XyPOXsJcoiHygjuA1RQ'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;
