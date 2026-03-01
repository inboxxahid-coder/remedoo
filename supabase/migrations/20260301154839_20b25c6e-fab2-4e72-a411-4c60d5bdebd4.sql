
-- =============================================
-- 1. PLATFORM COMMISSION CONFIG
-- =============================================
CREATE TABLE public.platform_commission_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type TEXT NOT NULL, -- 'doctor', 'hospital', 'pharmacy', 'lab'
  service_type TEXT NOT NULL DEFAULT 'appointment', -- 'appointment', 'order', 'ambulance', 'lab_test'
  commission_percent NUMERIC NOT NULL DEFAULT 10,
  flat_fee NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_type, service_type)
);

ALTER TABLE public.platform_commission_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commission config"
ON public.platform_commission_config FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Providers can view commission config"
ON public.platform_commission_config FOR SELECT
TO authenticated USING (true);

-- Seed default commission rates
INSERT INTO public.platform_commission_config (provider_type, service_type, commission_percent, description) VALUES
('doctor', 'appointment', 10, 'Doctor appointment commission'),
('hospital', 'appointment', 10, 'Hospital appointment commission'),
('hospital', 'ambulance', 5, 'Ambulance trip commission'),
('pharmacy', 'order', 8, 'Pharmacy order commission'),
('lab', 'lab_test', 10, 'Lab test commission');

-- =============================================
-- 2. PROVIDER EARNINGS (unified for doctor/pharmacy/lab)
-- =============================================
CREATE TABLE public.provider_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type TEXT NOT NULL, -- 'doctor', 'pharmacy', 'lab'
  provider_id UUID NOT NULL,
  reference_type TEXT NOT NULL, -- 'appointment', 'order', 'lab_test'
  reference_id UUID NOT NULL,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  commission_percent NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reference_type, reference_id)
);

ALTER TABLE public.provider_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all provider earnings"
ON public.provider_earnings FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can view own earnings"
ON public.provider_earnings FOR SELECT
USING (provider_type = 'doctor' AND provider_id IN (
  SELECT id FROM doctors WHERE user_id = auth.uid()
));

CREATE POLICY "Pharmacies can view own earnings"
ON public.provider_earnings FOR SELECT
USING (provider_type = 'pharmacy' AND provider_id IN (
  SELECT id FROM pharmacies WHERE user_id = auth.uid()
));

CREATE POLICY "Labs can view own earnings"
ON public.provider_earnings FOR SELECT
USING (provider_type = 'lab' AND provider_id IN (
  SELECT id FROM labs WHERE user_id = auth.uid()
));

-- =============================================
-- 3. PROVIDER WALLETS
-- =============================================
CREATE TABLE public.provider_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type TEXT NOT NULL,
  provider_id UUID NOT NULL,
  user_id UUID NOT NULL,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC NOT NULL DEFAULT 0,
  pending_withdrawal NUMERIC NOT NULL DEFAULT 0,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_type, provider_id)
);

ALTER TABLE public.provider_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all wallets"
ON public.provider_wallets FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Providers can view own wallet"
ON public.provider_wallets FOR SELECT
USING (user_id = auth.uid());

-- =============================================
-- 4. PAYOUT REQUESTS
-- =============================================
CREATE TABLE public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type TEXT NOT NULL,
  provider_id UUID NOT NULL,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, paid
  bank_details JSONB,
  admin_notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  paid_at TIMESTAMPTZ,
  transaction_reference TEXT
);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all payouts"
ON public.payout_requests FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Providers can view own payouts"
ON public.payout_requests FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Providers can create own payouts"
ON public.payout_requests FOR INSERT
WITH CHECK (user_id = auth.uid());

-- =============================================
-- 5. MEDICINE BATCH + EXPIRY TRACKING
-- =============================================
ALTER TABLE public.medicines
ADD COLUMN IF NOT EXISTS batch_number TEXT,
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS manufacturer TEXT;

-- =============================================
-- 6. LAB SAMPLE COLLECTIONS
-- =============================================
CREATE TABLE public.lab_sample_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  lab_id UUID NOT NULL REFERENCES labs(id),
  patient_id UUID NOT NULL,
  test_name TEXT NOT NULL,
  sample_type TEXT NOT NULL DEFAULT 'Blood',
  collection_type TEXT NOT NULL DEFAULT 'walk_in', -- walk_in, home
  collection_address TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  collected_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, collected, processing, completed, cancelled
  collector_name TEXT,
  collector_phone TEXT,
  report_url TEXT,
  report_version INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_sample_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all samples"
ON public.lab_sample_collections FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Labs can manage own samples"
ON public.lab_sample_collections FOR ALL
USING (lab_id IN (SELECT id FROM labs WHERE user_id = auth.uid()))
WITH CHECK (lab_id IN (SELECT id FROM labs WHERE user_id = auth.uid()));

CREATE POLICY "Patients can view own samples"
ON public.lab_sample_collections FOR SELECT
USING (patient_id = auth.uid());

-- =============================================
-- 7. SUPPORT TICKETS
-- =============================================
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general', -- general, payment, appointment, order, technical
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, resolved, closed
  admin_response TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all tickets"
ON public.support_tickets FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
ON public.support_tickets FOR UPDATE
USING (auth.uid() = user_id);

-- =============================================
-- 8. SUSPICIOUS ACTIVITY LOGS
-- =============================================
CREATE TABLE public.suspicious_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  activity_type TEXT NOT NULL, -- failed_login, unusual_access, rate_limit, data_anomaly
  description TEXT NOT NULL,
  ip_address TEXT,
  severity TEXT NOT NULL DEFAULT 'low', -- low, medium, high, critical
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suspicious_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage suspicious logs"
ON public.suspicious_activity_logs FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 9. COMMISSION ENGINE: Auto-create earnings on appointment completion
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_create_provider_earning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_commission_percent NUMERIC := 10;
  v_gross NUMERIC := 0;
  v_provider_type TEXT;
  v_provider_id UUID;
  v_config RECORD;
  v_wallet RECORD;
BEGIN
  -- Only trigger on completion
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Determine provider
    IF NEW.doctor_id IS NOT NULL THEN
      v_provider_type := 'doctor';
      v_provider_id := NEW.doctor_id;
      SELECT consultation_fee INTO v_gross FROM doctors WHERE id = NEW.doctor_id;
      v_gross := COALESCE(v_gross, 0);
    ELSIF NEW.lab_id IS NOT NULL THEN
      v_provider_type := 'lab';
      v_provider_id := NEW.lab_id;
      v_gross := 0; -- Lab tests priced differently
    ELSE
      RETURN NEW;
    END IF;

    -- Get commission rate from config
    SELECT commission_percent INTO v_commission_percent
    FROM platform_commission_config
    WHERE provider_type = v_provider_type AND service_type = 'appointment' AND is_active = true
    LIMIT 1;
    v_commission_percent := COALESCE(v_commission_percent, 10);

    IF v_gross > 0 THEN
      -- Insert earning (ignore if duplicate)
      INSERT INTO provider_earnings (provider_type, provider_id, reference_type, reference_id, gross_amount, commission_percent, commission_amount, net_amount, description)
      VALUES (v_provider_type, v_provider_id, 'appointment', NEW.id, v_gross, v_commission_percent, ROUND(v_gross * v_commission_percent / 100, 2), ROUND(v_gross * (100 - v_commission_percent) / 100, 2), NEW.service_type || ' appointment')
      ON CONFLICT (reference_type, reference_id) DO NOTHING;

      -- Upsert wallet
      INSERT INTO provider_wallets (provider_type, provider_id, user_id, total_earned, available_balance)
      SELECT v_provider_type, v_provider_id, 
        CASE v_provider_type WHEN 'doctor' THEN (SELECT user_id FROM doctors WHERE id = v_provider_id) WHEN 'lab' THEN (SELECT user_id FROM labs WHERE id = v_provider_id) END,
        ROUND(v_gross * (100 - v_commission_percent) / 100, 2),
        ROUND(v_gross * (100 - v_commission_percent) / 100, 2)
      ON CONFLICT (provider_type, provider_id) DO UPDATE SET
        total_earned = provider_wallets.total_earned + ROUND(v_gross * (100 - v_commission_percent) / 100, 2),
        available_balance = provider_wallets.available_balance + ROUND(v_gross * (100 - v_commission_percent) / 100, 2),
        updated_at = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_provider_earning
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_provider_earning();

-- =============================================
-- 10. Auto-commission for pharmacy orders on delivery
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_create_pharmacy_earning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_commission_percent NUMERIC := 8;
  v_gross NUMERIC;
  v_user_id UUID;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    v_gross := NEW.subtotal;

    SELECT commission_percent INTO v_commission_percent
    FROM platform_commission_config
    WHERE provider_type = 'pharmacy' AND service_type = 'order' AND is_active = true
    LIMIT 1;
    v_commission_percent := COALESCE(v_commission_percent, 8);

    SELECT user_id INTO v_user_id FROM pharmacies WHERE id = NEW.pharmacy_id;

    INSERT INTO provider_earnings (provider_type, provider_id, reference_type, reference_id, gross_amount, commission_percent, commission_amount, net_amount, description)
    VALUES ('pharmacy', NEW.pharmacy_id, 'order', NEW.id, v_gross, v_commission_percent, ROUND(v_gross * v_commission_percent / 100, 2), ROUND(v_gross * (100 - v_commission_percent) / 100, 2), 'Order delivery')
    ON CONFLICT (reference_type, reference_id) DO NOTHING;

    INSERT INTO provider_wallets (provider_type, provider_id, user_id, total_earned, available_balance)
    VALUES ('pharmacy', NEW.pharmacy_id, v_user_id, ROUND(v_gross * (100 - v_commission_percent) / 100, 2), ROUND(v_gross * (100 - v_commission_percent) / 100, 2))
    ON CONFLICT (provider_type, provider_id) DO UPDATE SET
      total_earned = provider_wallets.total_earned + ROUND(v_gross * (100 - v_commission_percent) / 100, 2),
      available_balance = provider_wallets.available_balance + ROUND(v_gross * (100 - v_commission_percent) / 100, 2),
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_pharmacy_earning
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_pharmacy_earning();

-- =============================================
-- 11. Auto-commission for ambulance trips
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_create_ambulance_earning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_commission_percent NUMERIC := 5;
  v_gross NUMERIC;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') AND NOT COALESCE(NEW.is_free, false) THEN
    v_gross := COALESCE(NEW.total_fare, 0);
    IF v_gross <= 0 THEN RETURN NEW; END IF;

    SELECT commission_percent INTO v_commission_percent
    FROM platform_commission_config
    WHERE provider_type = 'hospital' AND service_type = 'ambulance' AND is_active = true
    LIMIT 1;
    v_commission_percent := COALESCE(v_commission_percent, 5);

    -- Insert into hospital_earnings (existing table)
    INSERT INTO hospital_earnings (hospital_id, type, amount, platform_commission, net_earning, appointment_id, description)
    VALUES (NEW.hospital_id, 'ambulance', v_gross, ROUND(v_gross * v_commission_percent / 100, 2), ROUND(v_gross * (100 - v_commission_percent) / 100, 2), NULL, 'Ambulance trip #' || LEFT(NEW.id::text, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_ambulance_earning
BEFORE UPDATE ON public.ambulance_trips
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_ambulance_earning();

-- =============================================
-- 12. LAB TEST PACKAGES
-- =============================================
CREATE TABLE public.lab_test_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES labs(id),
  name TEXT NOT NULL,
  description TEXT,
  tests JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of {test_id, test_name}
  package_price NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_test_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active packages"
ON public.lab_test_packages FOR SELECT USING (true);

CREATE POLICY "Lab admins can manage own packages"
ON public.lab_test_packages FOR ALL
USING (lab_id IN (SELECT id FROM labs WHERE user_id = auth.uid()))
WITH CHECK (lab_id IN (SELECT id FROM labs WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all packages"
ON public.lab_test_packages FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 13. Enable realtime for key tables
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suspicious_activity_logs;

-- Updated_at triggers
CREATE TRIGGER update_commission_config_ts BEFORE UPDATE ON public.platform_commission_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sample_collections_ts BEFORE UPDATE ON public.lab_sample_collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_support_tickets_ts BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
