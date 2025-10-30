-- Secure RLS policies for admins table that prevent infinite recursion
-- Uses SECURITY DEFINER function to bypass RLS when checking admin status

-- Re-enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Drop any existing function with this name
DROP FUNCTION IF EXISTS is_org_admin(uuid, uuid);
DROP FUNCTION IF EXISTS is_org_admin(uuid);

-- Create a SECURITY DEFINER function that bypasses RLS to check admin status
CREATE OR REPLACE FUNCTION is_org_admin(check_user_id uuid, check_org_id uuid)
RETURNS boolean AS $$
BEGIN
  -- This function runs with SECURITY DEFINER, so it bypasses RLS
  -- It can read from the admins table without triggering policies
  RETURN EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = check_user_id 
    AND scope_type = 'org' 
    AND scope_id = check_org_id
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create secure policies using the function
CREATE POLICY "admins_select_secure" ON public.admins
FOR SELECT
TO authenticated
USING (
  -- Users can see admins for orgs they are admins of
  is_org_admin(auth.uid(), scope_id)
  OR
  -- Users can see their own admin records
  user_id = auth.uid()
);

CREATE POLICY "admins_insert_secure" ON public.admins
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only org admins can add other admins to their org
  scope_type = 'org' AND is_org_admin(auth.uid(), scope_id)
);

CREATE POLICY "admins_update_secure" ON public.admins
FOR UPDATE
TO authenticated
USING (
  -- Only org admins can update admins in their org
  scope_type = 'org' AND is_org_admin(auth.uid(), scope_id)
)
WITH CHECK (
  -- Can only update to the same org
  scope_type = 'org' AND is_org_admin(auth.uid(), scope_id)
);

CREATE POLICY "admins_delete_secure" ON public.admins
FOR DELETE
TO authenticated
USING (
  -- Only org admins can remove admins from their org
  scope_type = 'org' AND is_org_admin(auth.uid(), scope_id)
);
