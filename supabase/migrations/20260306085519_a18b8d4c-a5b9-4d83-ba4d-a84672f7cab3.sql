
-- Notification trigger for remedoo_orders status changes
CREATE OR REPLACE FUNCTION public.notify_remedoo_order_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.notifications (user_id, type, title, message, path)
    VALUES (
      NEW.user_id,
      'order',
      CASE
        WHEN NEW.status = 'placed' THEN 'Order Placed ✅'
        WHEN NEW.status = 'prescription_verification' THEN 'Prescription Under Review 📋'
        WHEN NEW.status = 'preparing' THEN 'Order Being Prepared 🧪'
        WHEN NEW.status = 'out_for_delivery' THEN 'Order Out for Delivery 🚚'
        WHEN NEW.status = 'delivered' THEN 'Order Delivered 📦'
        WHEN NEW.status = 'cancelled' THEN 'Order Cancelled ❌'
        ELSE 'Order Update 🛒'
      END,
      'Your Remedoo order (₹' || COALESCE(NEW.total::text, '0') || ') is now ' || replace(NEW.status, '_', ' ') || '.',
      '/remedoo-order/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_remedoo_order ON public.remedoo_orders;
CREATE TRIGGER trg_notify_remedoo_order
  AFTER INSERT OR UPDATE OF status ON public.remedoo_orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_remedoo_order_change();

-- Push notification trigger for remedoo_orders
CREATE OR REPLACE FUNCTION public.push_notify_remedoo_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  notif_title TEXT;
  notif_message TEXT;
  internal_secret TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('placed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled') THEN
    notif_title := CASE NEW.status
      WHEN 'placed' THEN 'Order Confirmed ✅'
      WHEN 'preparing' THEN 'Order Being Prepared 🧪'
      WHEN 'out_for_delivery' THEN 'Out for Delivery 🚚'
      WHEN 'delivered' THEN 'Order Delivered 📦'
      WHEN 'cancelled' THEN 'Order Cancelled ❌'
    END;
    notif_message := 'Your Remedoo order (₹' || COALESCE(NEW.total::text, '0') || ') is now ' || replace(NEW.status, '_', ' ') || '.';

    SELECT value INTO internal_secret FROM public.internal_config WHERE key = 'push_secret';

    PERFORM net.http_post(
      url := 'https://suicqpfijnsortcszqep.supabase.co/functions/v1/send-push-notification',
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', notif_title,
        'message', notif_message,
        'path', '/remedoo-order/' || NEW.id
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
$$;

DROP TRIGGER IF EXISTS trg_push_notify_remedoo_order ON public.remedoo_orders;
CREATE TRIGGER trg_push_notify_remedoo_order
  AFTER UPDATE OF status ON public.remedoo_orders
  FOR EACH ROW EXECUTE FUNCTION public.push_notify_remedoo_order();
