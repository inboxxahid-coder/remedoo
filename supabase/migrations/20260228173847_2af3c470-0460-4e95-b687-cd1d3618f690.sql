
CREATE OR REPLACE FUNCTION public.push_notify_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  notif_title TEXT;
  notif_message TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('confirmed', 'out_for_delivery', 'delivered', 'cancelled') THEN
    notif_title := CASE NEW.status
      WHEN 'confirmed' THEN 'Order Confirmed ✅'
      WHEN 'out_for_delivery' THEN 'Order Out for Delivery 🚚'
      WHEN 'delivered' THEN 'Order Delivered 📦'
      WHEN 'cancelled' THEN 'Order Cancelled ❌'
    END;
    notif_message := 'Your order (₹' || NEW.total || ') is now ' || replace(NEW.status, '_', ' ') || '.';

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
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1aWNxcGZpam5zb3J0Y3N6cWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDc4MjQsImV4cCI6MjA4Nzc4MzgyNH0.teNIccPIhtIoPmAHd9OtNHi0XyPOXsJcoiHygjuA1RQ'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;
