
-- Provider payment accounts table
CREATE TABLE public.provider_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type TEXT NOT NULL CHECK (provider_type IN ('doctor', 'hospital', 'lab', 'pharmacy')),
  provider_id UUID NOT NULL,
  user_id UUID NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'upi' CHECK (payment_method IN ('upi', 'bank_account')),
  upi_id TEXT,
  account_holder_name TEXT,
  bank_account_number TEXT,
  ifsc_code TEXT,
  bank_name TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT false,
  change_count INTEGER NOT NULL DEFAULT 0,
  last_change_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_type, provider_id)
);

ALTER TABLE public.provider_payment_accounts ENABLE ROW LEVEL SECURITY;

-- Providers can read/update their own payment account
CREATE POLICY "Providers can view own payment account"
  ON public.provider_payment_accounts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Providers can insert own payment account"
  ON public.provider_payment_accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Providers can update own payment account"
  ON public.provider_payment_accounts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Admin can do everything via has_role
CREATE POLICY "Admins can manage all payment accounts"
  ON public.provider_payment_accounts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Payment change request log
CREATE TABLE public.payment_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_account_id UUID REFERENCES public.provider_payment_accounts(id) ON DELETE CASCADE NOT NULL,
  provider_type TEXT NOT NULL,
  provider_id UUID NOT NULL,
  user_id UUID NOT NULL,
  old_details JSONB,
  new_details JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers view own change requests"
  ON public.payment_change_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Providers insert own change requests"
  ON public.payment_change_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage all change requests"
  ON public.payment_change_requests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add verification fields to transactions table
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_verification_status TEXT DEFAULT 'unverified' CHECK (payment_verification_status IN ('verified', 'unverified', 'failed')),
  ADD COLUMN IF NOT EXISTS payment_gateway_response JSONB,
  ADD COLUMN IF NOT EXISTS transaction_timestamp TIMESTAMPTZ DEFAULT now();

-- Trigger to update updated_at
CREATE TRIGGER update_provider_payment_accounts_updated_at
  BEFORE UPDATE ON public.provider_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
