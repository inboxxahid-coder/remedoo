ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude double precision DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude double precision DEFAULT NULL;