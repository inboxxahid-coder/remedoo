
CREATE TABLE public.platform_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL UNIQUE,
  key_value TEXT NOT NULL DEFAULT '',
  display_label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_masked BOOLEAN NOT NULL DEFAULT true,
  last_changed_at TIMESTAMPTZ,
  changed_by UUID,
  cooldown_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api keys"
ON public.platform_api_keys
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_api_keys (key_name, display_label, category, cooldown_minutes) VALUES
  ('RAZORPAY_KEY_ID', 'Razorpay Key ID', 'payment', 30),
  ('RAZORPAY_KEY_SECRET', 'Razorpay Key Secret', 'payment', 60),
  ('MSG91_AUTH_KEY', 'MSG91 Auth Key', 'messaging', 30),
  ('WHATSAPP_ACCESS_TOKEN', 'WhatsApp Access Token', 'messaging', 30),
  ('WHATSAPP_PHONE_NUMBER_ID', 'WhatsApp Phone Number ID', 'messaging', 30),
  ('TWILIO_ACCOUNT_SID', 'Twilio Account SID', 'messaging', 30),
  ('TWILIO_AUTH_TOKEN', 'Twilio Auth Token', 'messaging', 60),
  ('TWILIO_PHONE_NUMBER', 'Twilio Phone Number', 'messaging', 15),
  ('TWILIO_WHATSAPP_NUMBER', 'Twilio WhatsApp Number', 'messaging', 15),
  ('GOOGLE_MAPS_API_KEY', 'Google Maps API Key', 'maps', 30);
