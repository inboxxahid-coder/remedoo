
-- Create a master lab tests catalog that labs can reference
CREATE TABLE public.lab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT,
  sample_type TEXT DEFAULT 'Blood',
  turnaround_time TEXT DEFAULT '24 hours',
  price NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  is_popular BOOLEAN DEFAULT false,
  requires_fasting BOOLEAN DEFAULT false,
  home_collection BOOLEAN DEFAULT true,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;

-- Everyone can view tests
CREATE POLICY "Lab tests viewable by everyone"
ON public.lab_tests FOR SELECT USING (true);

-- Lab admins can manage own tests
CREATE POLICY "Lab admins can manage own tests"
ON public.lab_tests FOR ALL
USING (lab_id IN (SELECT id FROM labs WHERE user_id = auth.uid()))
WITH CHECK (lab_id IN (SELECT id FROM labs WHERE user_id = auth.uid()));

-- Admins can manage all tests
CREATE POLICY "Admins can manage all lab tests"
ON public.lab_tests FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));
