
-- Drop the overly permissive insert policy and replace with admin + service-role only
DROP POLICY "System can insert notifications" ON public.notifications;

-- Only allow inserts via service role (triggers use SECURITY DEFINER which bypasses RLS)
-- Users should not be able to insert notifications directly
CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));
