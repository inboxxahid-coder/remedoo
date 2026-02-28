
-- Fix labs RLS: drop restrictive policy and create permissive one
DROP POLICY IF EXISTS "Labs are viewable by everyone" ON public.labs;
CREATE POLICY "Labs are viewable by everyone" ON public.labs FOR SELECT USING (true);

-- Fix hospitals RLS
DROP POLICY IF EXISTS "Hospitals are viewable by everyone" ON public.hospitals;
CREATE POLICY "Hospitals are viewable by everyone" ON public.hospitals FOR SELECT USING (true);

-- Fix doctors RLS
DROP POLICY IF EXISTS "Doctors are viewable by everyone" ON public.doctors;
CREATE POLICY "Doctors are viewable by everyone" ON public.doctors FOR SELECT USING (true);

-- Fix pharmacies RLS
DROP POLICY IF EXISTS "Pharmacies are viewable by everyone" ON public.pharmacies;
CREATE POLICY "Pharmacies are viewable by everyone" ON public.pharmacies FOR SELECT USING (true);

-- Fix medicines RLS
DROP POLICY IF EXISTS "Medicines viewable by everyone" ON public.medicines;
CREATE POLICY "Medicines viewable by everyone" ON public.medicines FOR SELECT USING (true);

-- Fix ads RLS
DROP POLICY IF EXISTS "Ads viewable by everyone" ON public.ads;
CREATE POLICY "Ads viewable by everyone" ON public.ads FOR SELECT USING (true);

-- Fix slider_media RLS
DROP POLICY IF EXISTS "Slider media viewable by everyone" ON public.slider_media;
CREATE POLICY "Slider media viewable by everyone" ON public.slider_media FOR SELECT USING (true);

-- Fix ambulances RLS
DROP POLICY IF EXISTS "Ambulances viewable by everyone" ON public.ambulances;
CREATE POLICY "Ambulances viewable by everyone" ON public.ambulances FOR SELECT USING (true);
