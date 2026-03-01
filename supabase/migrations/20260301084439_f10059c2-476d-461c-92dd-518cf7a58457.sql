
-- Admin-configurable OTP channel settings (singleton row)
CREATE TABLE public.cancellation_otp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  otp_required_for_confirmed boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cancellation_otp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage OTP settings"
  ON public.cancellation_otp_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read OTP settings"
  ON public.cancellation_otp_settings FOR SELECT
  USING (true);

-- Insert default row
INSERT INTO public.cancellation_otp_settings (email_enabled, sms_enabled, whatsapp_enabled, otp_required_for_confirmed)
VALUES (true, false, false, true);

-- OTP codes table
CREATE TABLE public.cancellation_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  otp_code text NOT NULL,
  channels_used text[] NOT NULL DEFAULT '{}',
  verified boolean NOT NULL DEFAULT false,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cancellation_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own OTPs"
  ON public.cancellation_otps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert OTPs"
  ON public.cancellation_otps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OTPs"
  ON public.cancellation_otps FOR UPDATE
  USING (auth.uid() = user_id);
