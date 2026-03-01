-- Add admin_note column to doctors for revision/rejection notes
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS admin_note text;

-- Add admin_note to hospitals, labs, pharmacies too for consistency
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE public.labs ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS admin_note text;