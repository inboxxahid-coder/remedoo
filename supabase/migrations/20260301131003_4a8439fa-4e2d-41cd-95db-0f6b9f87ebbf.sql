
-- Add home collection fee to lab_tests
ALTER TABLE public.lab_tests ADD COLUMN home_collection_fee numeric DEFAULT 0;
