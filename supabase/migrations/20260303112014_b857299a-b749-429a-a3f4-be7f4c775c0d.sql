
-- Create internal config table for shared secrets (no public access)
CREATE TABLE IF NOT EXISTS public.internal_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS and deny all public access
ALTER TABLE public.internal_config ENABLE ROW LEVEL SECURITY;
-- No RLS policies = no public access, only SECURITY DEFINER functions can read

-- Insert a random internal push secret
INSERT INTO public.internal_config (key, value)
VALUES ('push_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- Update push_notify_appointment_confirmed to use internal secret
CREATE OR REPLACE FUNCTION public.push_notify_appointment_confirmed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  provider_name TEXT;
  notif_title TEXT;
  notif_message TEXT;
  internal_secret TEXT;
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

    SELECT value INTO internal_secret FROM public.internal_config WHERE key = 'push_secret';

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
        'Authorization', 'Bearer internal',
        'x-internal-secret', COALESCE(internal_secret, '')
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Update push_notify_order_status to use internal secret
CREATE OR REPLACE FUNCTION public.push_notify_order_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  notif_title TEXT;
  notif_message TEXT;
  internal_secret TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('confirmed', 'out_for_delivery', 'delivered', 'cancelled') THEN
    notif_title := CASE NEW.status
      WHEN 'confirmed' THEN 'Order Confirmed ✅'
      WHEN 'out_for_delivery' THEN 'Order Out for Delivery 🚚'
      WHEN 'delivered' THEN 'Order Delivered 📦'
      WHEN 'cancelled' THEN 'Order Cancelled ❌'
    END;
    notif_message := 'Your order (₹' || NEW.total || ') is now ' || replace(NEW.status, '_', ' ') || '.';

    SELECT value INTO internal_secret FROM public.internal_config WHERE key = 'push_secret';

    PERFORM net.http_post(
      url := 'https://suicqpfijnsortcszqep.supabase.co/functions/v1/send-push-notification',
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', notif_title,
        'message', notif_message,
        'path', '/order/' || NEW.id
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer internal',
        'x-internal-secret', COALESCE(internal_secret, '')
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;
