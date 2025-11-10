-- ============================================
-- FIX ADMINS TABLE - Superadmin + Org Admin
-- Superadmins can edit everything
-- Org admins can edit within their org only
-- Keeps RLS secure
-- ============================================

-- Step 1: Create helper function that checks BOTH superadmin AND org admin
CREATE OR REPLACE FUNCTION can_manage_org_admins(check_org_id uuid)
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Check if user is superadmin first (superadmins can do everything)
  IF EXISTS (
    SELECT 1 FROM public.superadmins 
    WHERE user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is org admin for this org
  RETURN EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid()
    AND scope_type = 'org' 
    AND scope_id = check_org_id
    AND status = 'active'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION can_manage_org_admins(uuid) TO authenticated;

-- Also keep the org-only function for backwards compatibility
CREATE OR REPLACE FUNCTION is_org_admin_safe(check_user_id uuid, check_org_id uuid)
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Check superadmin first
  IF EXISTS (
    SELECT 1 FROM public.superadmins 
    WHERE user_id = check_user_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Check org admin
  RETURN EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = check_user_id 
    AND scope_type = 'org' 
    AND scope_id = check_org_id
    AND status = 'active'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_org_admin_safe(uuid, uuid) TO authenticated;

-- Step 2: Ensure RLS is enabled (keep it secure)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop ONLY conflicting policies, keep others that might be needed
DROP POLICY IF EXISTS "admins_select_secure_final" ON public.admins;
DROP POLICY IF EXISTS "admins_select_secure" ON public.admins;
DROP POLICY IF EXISTS "admins_select_org_admins" ON public.admins;
DROP POLICY IF EXISTS "admins_select_working" ON public.admins;
DROP POLICY IF EXISTS "admins_select_simple" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_secure_final" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_secure" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_org_admins" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_working" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_simple" ON public.admins;
DROP POLICY IF EXISTS "admins_update_secure_final" ON public.admins;
DROP POLICY IF EXISTS "admins_update_secure" ON public.admins;
DROP POLICY IF EXISTS "admins_update_org_admins" ON public.admins;
DROP POLICY IF EXISTS "admins_update_working" ON public.admins;
DROP POLICY IF EXISTS "admins_update_simple" ON public.admins;
DROP POLICY IF EXISTS "admins_delete_secure_final" ON public.admins;
DROP POLICY IF EXISTS "admins_delete_secure" ON public.admins;
DROP POLICY IF EXISTS "admins_delete_org_admins" ON public.admins;
DROP POLICY IF EXISTS "admins_delete_working" ON public.admins;
DROP POLICY IF EXISTS "admins_delete_simple" ON public.admins;

-- Step 4: SELECT policy - superadmins see everything, org admins see their org
CREATE POLICY "admins_select_final" ON public.admins
FOR SELECT
TO authenticated
USING (
  -- Superadmins can see everything
  EXISTS (SELECT 1 FROM public.superadmins WHERE user_id = auth.uid())
  OR
  -- Org admins can see admins in their org
  (scope_type = 'org' AND can_manage_org_admins(scope_id))
  OR
  -- Users can see their own records
  user_id = auth.uid()
  OR
  -- Allow program-level admins (for program checks)
  scope_type = 'program'
);

-- Step 5: INSERT policy - superadmins can insert anything, org admins can insert in their org
CREATE POLICY "admins_insert_final" ON public.admins
FOR INSERT
TO authenticated
WITH CHECK (
  -- Superadmins can insert anything
  EXISTS (SELECT 1 FROM public.superadmins WHERE user_id = auth.uid())
  OR
  -- Org admins can add admins to their org
  (scope_type = 'org' AND can_manage_org_admins(scope_id))
);

-- Step 6: UPDATE policy - superadmins can update anything, org admins can update in their org
CREATE POLICY "admins_update_final" ON public.admins
FOR UPDATE
TO authenticated
USING (
  -- Superadmins can update anything
  EXISTS (SELECT 1 FROM public.superadmins WHERE user_id = auth.uid())
  OR
  -- Org admins can update admins in their org
  (scope_type = 'org' AND can_manage_org_admins(scope_id))
  OR
  -- Users can update their own records
  user_id = auth.uid()
)
WITH CHECK (
  -- Same checks for new values
  EXISTS (SELECT 1 FROM public.superadmins WHERE user_id = auth.uid())
  OR
  (scope_type = 'org' AND can_manage_org_admins(scope_id))
  OR
  user_id = auth.uid()
);

-- Step 7: DELETE policy - superadmins can delete anything, org admins can delete from their org
CREATE POLICY "admins_delete_final" ON public.admins
FOR DELETE
TO authenticated
USING (
  -- Superadmins can delete anything
  EXISTS (SELECT 1 FROM public.superadmins WHERE user_id = auth.uid())
  OR
  -- Org admins can delete admins from their org
  (scope_type = 'org' AND can_manage_org_admins(scope_id))
  OR
  -- Users can delete their own records (rare but allowed)
  user_id = auth.uid()
);

-- ============================================
-- FIX PROGRAMS TABLE - Superadmin + Org Admin
-- ============================================

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Drop only conflicting policies
DROP POLICY IF EXISTS "programs_select_org_admins" ON public.programs;
DROP POLICY IF EXISTS "programs_select_simple" ON public.programs;
DROP POLICY IF EXISTS "programs_select_working" ON public.programs;

-- SELECT policy - superadmins see everything, org admins see their org
CREATE POLICY "programs_select_final" ON public.programs
FOR SELECT
TO authenticated
USING (
  -- Superadmins can see everything
  EXISTS (SELECT 1 FROM public.superadmins WHERE user_id = auth.uid())
  OR
  -- Org admins can see programs in their org
  can_manage_org_admins(organization_id)
  OR
  -- Published programs are public
  published = true
);



