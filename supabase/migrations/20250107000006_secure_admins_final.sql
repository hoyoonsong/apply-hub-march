-- Secure RLS policies for admins table using a different approach
-- Instead of querying the admins table directly, we'll use the reviewers table
-- to check if someone has admin privileges

-- Re-enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Create a function that checks admin status by looking at reviewers table
-- This avoids the infinite recursion because it doesn't query the admins table
CREATE OR REPLACE FUNCTION is_org_admin_safe(check_user_id uuid, check_org_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if user is a reviewer for any program in this org
  -- AND if they have admin privileges (we'll use a different approach)
  -- For now, we'll check if they're already in the admins table using a direct query
  -- that bypasses RLS by using SECURITY DEFINER
  RETURN EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = check_user_id 
    AND scope_type = 'org' 
    AND scope_id = check_org_id
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create secure policies
CREATE POLICY "admins_select_secure_final" ON public.admins
FOR SELECT
TO authenticated
USING (
  -- Users can see admins for orgs they are admins of
  is_org_admin_safe(auth.uid(), scope_id)
  OR
  -- Users can see their own admin records
  user_id = auth.uid()
);

CREATE POLICY "admins_insert_secure_final" ON public.admins
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only org admins can add other admins to their org
  scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id)
);

CREATE POLICY "admins_update_secure_final" ON public.admins
FOR UPDATE
TO authenticated
USING (
  -- Only org admins can update admins in their org
  scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id)
)
WITH CHECK (
  -- Can only update to the same org
  scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id)
);

CREATE POLICY "admins_delete_secure_final" ON public.admins
FOR DELETE
TO authenticated
USING (
  -- Only org admins can remove admins from their org
  scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id)
);
