
-- Add new columns to remedoo_pharmacy_inventory
ALTER TABLE public.remedoo_pharmacy_inventory
  ADD COLUMN IF NOT EXISTS manufacturing_date text,
  ADD COLUMN IF NOT EXISTS dosage_info text,
  ADD COLUMN IF NOT EXISTS side_effects text,
  ADD COLUMN IF NOT EXISTS usage_instructions text,
  ADD COLUMN IF NOT EXISTS drug_category text DEFAULT 'otc',
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS brand_name text;

-- Add prescription verification and refund columns to remedoo_orders
ALTER TABLE public.remedoo_orders
  ADD COLUMN IF NOT EXISTS prescription_status text DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS prescription_verified_by uuid,
  ADD COLUMN IF NOT EXISTS prescription_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS prescription_rejection_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_status text,
  ADD COLUMN IF NOT EXISTS refund_amount numeric DEFAULT 0;

-- Insert delivery fee settings into platform_settings
INSERT INTO public.platform_settings (key, value, label, category, type) VALUES
  ('remedoo_base_delivery_fee', '30', 'Base Delivery Fee (₹)', 'pharmacy', 'number'),
  ('remedoo_free_delivery_threshold', '499', 'Free Delivery Above (₹)', 'pharmacy', 'number'),
  ('remedoo_per_km_delivery_fee', '5', 'Per KM Delivery Fee (₹)', 'pharmacy', 'number')
ON CONFLICT (key) DO NOTHING;
