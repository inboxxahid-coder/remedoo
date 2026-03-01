
-- Add latitude/longitude to labs
ALTER TABLE public.labs ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.labs ADD COLUMN IF NOT EXISTS longitude double precision;

-- Add latitude/longitude to pharmacies
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS longitude double precision;
