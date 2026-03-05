CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_team_id uuid NOT NULL REFERENCES public.admin_team(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_team_id, page_path)
);

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage permissions"
ON public.admin_permissions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));