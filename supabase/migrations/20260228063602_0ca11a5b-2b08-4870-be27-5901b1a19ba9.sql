
-- Create payments/wallet table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'payment',
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  description TEXT,
  category TEXT DEFAULT 'general',
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create emergency_requests table
CREATE TABLE public.emergency_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_ambulance_id UUID,
  response_time_minutes NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own emergency requests" ON public.emergency_requests FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Users can create own emergency requests" ON public.emergency_requests FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Users can update own emergency requests" ON public.emergency_requests FOR UPDATE USING (auth.uid() = patient_id);

-- Create ambulances table
CREATE TABLE public.ambulances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_number TEXT NOT NULL,
  driver_name TEXT,
  driver_phone TEXT,
  current_latitude DOUBLE PRECISION,
  current_longitude DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'available',
  assigned_patient_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ambulances viewable by everyone" ON public.ambulances FOR SELECT USING (true);

-- Enable realtime for ambulances (for tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE public.ambulances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_requests;

-- Add trigger for updated_at
CREATE TRIGGER update_emergency_requests_updated_at BEFORE UPDATE ON public.emergency_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ambulances_updated_at BEFORE UPDATE ON public.ambulances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
