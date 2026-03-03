
-- Rate limiting table for edge functions
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE UNIQUE INDEX idx_rate_limits_key_endpoint ON public.rate_limits (user_key, endpoint);

-- Enable RLS (no public access)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Function to check and increment rate limit
-- Returns TRUE if request is allowed, FALSE if rate limited
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_key text,
  _endpoint text,
  _max_requests integer,
  _window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _current_count integer;
  _window_start timestamptz;
BEGIN
  -- Try to get existing record
  SELECT request_count, window_start INTO _current_count, _window_start
  FROM rate_limits
  WHERE user_key = _user_key AND endpoint = _endpoint;

  IF NOT FOUND THEN
    -- First request, create record
    INSERT INTO rate_limits (user_key, endpoint, request_count, window_start)
    VALUES (_user_key, _endpoint, 1, now())
    ON CONFLICT (user_key, endpoint) DO UPDATE
    SET request_count = 1, window_start = now();
    RETURN true;
  END IF;

  -- Check if window has expired
  IF _window_start + (_window_seconds || ' seconds')::interval < now() THEN
    -- Reset window
    UPDATE rate_limits
    SET request_count = 1, window_start = now()
    WHERE user_key = _user_key AND endpoint = _endpoint;
    RETURN true;
  END IF;

  -- Check if under limit
  IF _current_count < _max_requests THEN
    UPDATE rate_limits
    SET request_count = request_count + 1
    WHERE user_key = _user_key AND endpoint = _endpoint;
    RETURN true;
  END IF;

  -- Rate limited
  RETURN false;
END;
$$;

-- Cleanup old rate limit entries (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM rate_limits WHERE window_start < now() - interval '24 hours';
$$;

-- Create a view for doctors that excludes sensitive fields
CREATE OR REPLACE VIEW public.doctors_public AS
SELECT 
  id, name, specialization, bio, consultation_fee, consultation_duration,
  experience_years, hospital_id, department_id, image_url, rating,
  working_hours, is_featured, featured_sort_order, emergency_available,
  max_appointments_per_day, approval_status, account_status, created_at,
  vacation_dates
FROM public.doctors;
