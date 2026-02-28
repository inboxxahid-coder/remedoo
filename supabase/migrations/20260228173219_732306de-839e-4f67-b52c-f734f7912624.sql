
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

    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', notif_title,
        'message', notif_message,
        'path', '/order/' || NEW.id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_push_notify_order_status
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.push_notify_order_status();
