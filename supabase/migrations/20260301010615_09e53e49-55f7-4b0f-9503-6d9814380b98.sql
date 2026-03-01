
-- Allow users to view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to insert themselves as providers (pending approval)
CREATE POLICY "Users can register as doctor"
ON public.doctors FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND approval_status = 'pending');

CREATE POLICY "Users can register as hospital"
ON public.hospitals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND approval_status = 'pending');

CREATE POLICY "Users can register as lab"
ON public.labs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND approval_status = 'pending');

CREATE POLICY "Users can register as pharmacy"
ON public.pharmacies FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND approval_status = 'pending');

-- Allow users to assign themselves a provider role (only provider roles, not admin)
CREATE POLICY "Users can self-assign provider role"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role IN ('doctor'::app_role, 'hospital_admin'::app_role, 'lab_admin'::app_role, 'pharmacy_admin'::app_role)
);
