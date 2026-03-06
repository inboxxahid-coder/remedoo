
-- 1. Healthcare Packages table
CREATE TABLE public.healthcare_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type TEXT NOT NULL DEFAULT 'hospital' CHECK (provider_type IN ('hospital', 'lab')),
  provider_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tests_included JSONB DEFAULT '[]',
  original_price NUMERIC NOT NULL DEFAULT 0,
  discounted_price NUMERIC,
  duration_days INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  bookings_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.healthcare_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active packages" ON public.healthcare_packages
  FOR SELECT USING (is_active = true);
CREATE POLICY "Providers can manage own packages" ON public.healthcare_packages
  FOR ALL USING (
    (provider_type = 'hospital' AND provider_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid()))
    OR (provider_type = 'lab' AND provider_id IN (SELECT id FROM labs WHERE user_id = auth.uid()))
  );

-- 2. Transactions table (consolidated ledger)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider_type TEXT,
  provider_id UUID,
  service_type TEXT NOT NULL,
  reference_id UUID,
  amount NUMERIC NOT NULL DEFAULT 0,
  platform_commission NUMERIC DEFAULT 0,
  provider_payout NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'online',
  payment_status TEXT DEFAULT 'pending',
  currency TEXT DEFAULT 'INR',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own transactions" ON public.transactions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins manage transactions" ON public.transactions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. Corporate Health Plans
CREATE TABLE public.corporate_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  plan_type TEXT DEFAULT 'basic' CHECK (plan_type IN ('basic', 'premium', 'enterprise')),
  max_employees INTEGER DEFAULT 50,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  services_included JSONB DEFAULT '["consultations", "checkups", "emergency"]',
  is_active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.corporate_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage corporate plans" ON public.corporate_plans
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 4. Featured flags for hospitals, labs, pharmacies
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS featured_sort_order INTEGER DEFAULT 0;
ALTER TABLE public.labs ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.labs ADD COLUMN IF NOT EXISTS featured_sort_order INTEGER DEFAULT 0;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS featured_sort_order INTEGER DEFAULT 0;

-- 5. Ad campaign tracking columns
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS advertiser_name TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS advertiser_type TEXT;

-- 6. Video consultation fields on doctors
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS video_consultation_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS video_consultation_fee NUMERIC DEFAULT 0;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS video_consultation_duration INTEGER DEFAULT 15;

-- 7. Video consultation type in appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS is_video_consultation BOOLEAN DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS video_meeting_link TEXT;

-- 8. Package bookings table
CREATE TABLE public.package_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES public.healthcare_packages(id) NOT NULL,
  user_id UUID NOT NULL,
  family_member_id UUID REFERENCES public.family_members(id),
  status TEXT DEFAULT 'booked' CHECK (status IN ('booked', 'in_progress', 'completed', 'cancelled')),
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'online',
  amount_paid NUMERIC DEFAULT 0,
  booking_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.package_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own package bookings" ON public.package_bookings
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can book packages" ON public.package_bookings
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage package bookings" ON public.package_bookings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 9. Transaction trigger for appointments
CREATE OR REPLACE FUNCTION public.log_appointment_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_commission_percent NUMERIC := 10;
  v_fee NUMERIC := 0;
  v_provider_type TEXT;
  v_provider_id UUID;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    IF NEW.doctor_id IS NOT NULL THEN
      v_provider_type := 'doctor';
      v_provider_id := NEW.doctor_id;
      SELECT consultation_fee INTO v_fee FROM doctors WHERE id = NEW.doctor_id;
    ELSIF NEW.lab_id IS NOT NULL THEN
      v_provider_type := 'lab';
      v_provider_id := NEW.lab_id;
    ELSIF NEW.hospital_id IS NOT NULL THEN
      v_provider_type := 'hospital';
      v_provider_id := NEW.hospital_id;
    ELSE
      RETURN NEW;
    END IF;

    v_fee := COALESCE(v_fee, 0);
    IF v_fee <= 0 THEN RETURN NEW; END IF;

    SELECT commission_percent INTO v_commission_percent
    FROM platform_commission_config
    WHERE provider_type = v_provider_type AND is_active = true
    LIMIT 1;
    v_commission_percent := COALESCE(v_commission_percent, 10);

    INSERT INTO transactions (user_id, provider_type, provider_id, service_type, reference_id, amount, platform_commission, provider_payout, payment_method, payment_status)
    VALUES (NEW.patient_id, v_provider_type, v_provider_id, NEW.service_type, NEW.id, v_fee, ROUND(v_fee * v_commission_percent / 100, 2), ROUND(v_fee * (100 - v_commission_percent) / 100, 2), NEW.payment_method, NEW.payment_status)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_appointment_transaction
  AFTER UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.log_appointment_transaction();

-- 10. Increment package bookings count trigger
CREATE OR REPLACE FUNCTION public.increment_package_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE healthcare_packages SET bookings_count = bookings_count + 1 WHERE id = NEW.package_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_package_bookings
  AFTER INSERT ON public.package_bookings
  FOR EACH ROW EXECUTE FUNCTION public.increment_package_bookings();
