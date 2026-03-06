
-- 1. Remedoo Pharmacy Inventory
CREATE TABLE public.remedoo_pharmacy_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  price NUMERIC NOT NULL DEFAULT 0,
  mrp NUMERIC,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  batch_number TEXT,
  expiry_date DATE,
  supplier_name TEXT,
  supplier_contact TEXT,
  requires_prescription BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  image_url TEXT,
  discount_percent NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.remedoo_pharmacy_inventory ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access remedoo inventory" ON public.remedoo_pharmacy_inventory
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public read for active items
CREATE POLICY "Public read active remedoo inventory" ON public.remedoo_pharmacy_inventory
  FOR SELECT TO authenticated
  USING (is_active = true);

-- 2. Delivery Drivers
CREATE TABLE public.delivery_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  vehicle_type TEXT DEFAULT 'bike',
  vehicle_number TEXT,
  license_number TEXT,
  license_url TEXT,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('available', 'on_delivery', 'offline')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access delivery drivers" ON public.delivery_drivers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Driver reads own record" ON public.delivery_drivers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Driver updates own record" ON public.delivery_drivers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Remedoo Orders (separate from partner pharmacy orders)
CREATE TABLE public.remedoo_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'prescription_verification', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  payment_method TEXT NOT NULL DEFAULT 'cod',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  prescription_url TEXT,
  delivery_address TEXT,
  notes TEXT,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.remedoo_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access remedoo orders" ON public.remedoo_orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "User reads own remedoo orders" ON public.remedoo_orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "User creates own remedoo orders" ON public.remedoo_orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4. Delivery Orders (links orders to drivers)
CREATE TABLE public.delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.remedoo_orders(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.delivery_drivers(id),
  pickup_address TEXT DEFAULT 'Remedoo Pharmacy Warehouse',
  delivery_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
  driver_latitude NUMERIC,
  driver_longitude NUMERIC,
  estimated_delivery_minutes INTEGER,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access delivery orders" ON public.delivery_orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Driver reads assigned deliveries" ON public.delivery_orders
  FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid()));

CREATE POLICY "Driver updates assigned deliveries" ON public.delivery_orders
  FOR UPDATE TO authenticated
  USING (driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid()))
  WITH CHECK (driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid()));

CREATE POLICY "User reads own delivery orders" ON public.delivery_orders
  FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM public.remedoo_orders WHERE user_id = auth.uid()));

-- Enable realtime for delivery tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.remedoo_orders;
