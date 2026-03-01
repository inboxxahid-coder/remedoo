
-- Add is_government flag to hospitals
ALTER TABLE public.hospitals ADD COLUMN is_government boolean NOT NULL DEFAULT false;
