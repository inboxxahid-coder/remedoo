
-- Enable the pg_net extension for async HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Recreate order trigger function using extensions.http_post
CREATE OR REPLACE FUNCTION public.push_notify_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  function_url TEXT;
  service_role_key TEXT;
  notif_title TEXT;
  notif_message TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('confirmed', 'out_for_delivery', 'delivered') THEN
    notif_title := CASE NEW.status
      WHEN 'confirmed' THEN 'Order Confirmed ✅'
      WHEN 'out_for_delivery' THEN 'Order Out for Delivery 🚚'
      WHEN 'delivered' THEN 'Order Delivered 📦'
    END;

    notif_message := 'Your order (₹' || NEW.total || ') is now ' || replace(NEW.status, '_', ' ') || '.';

    function_url := rtrim(current_setting('app.settings.supabase_url', true), '/') || '/functions/v1/send-push-notification';
    service_role_key := current_setting('app.settings.service_role_key', true);

    PERFORM extensions.http_post(
      url := function_url,
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', notif_title,
        'message', notif_message,
        'path', '/order/' || NEW.id
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate appointment trigger function using extensions.http_post
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
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'confirmed' THEN
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

    function_url := rtrim(current_setting('app.settings.supabase_url', true), '/') || '/functions/v1/send-push-notification';
    service_role_key := current_setting('app.settings.service_role_key', true);

    PERFORM extensions.http_post(
      url := function_url,
      body := jsonb_build_object(
        'user_id', NEW.patient_id,
        'title', 'Appointment Confirmed ✅',
        'message', 'Your ' || NEW.service_type || ' appointment with ' || provider_name || ' on ' || NEW.appointment_date || ' at ' || NEW.appointment_time || ' has been confirmed.',
        'path', '/appointments'
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      )
    );
  END IF;
  RETURN NEW;
END;
$$;
