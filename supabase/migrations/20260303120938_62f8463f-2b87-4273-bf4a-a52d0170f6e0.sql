
ALTER TABLE public.internal_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read internal config"
  ON public.internal_config
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage internal config"
  ON public.internal_config
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
