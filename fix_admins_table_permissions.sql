-- ============================================
-- FIX ADMINS TABLE PERMISSIONS
-- This fixes both reading (SELECT) and adding (INSERT) admins
-- ============================================

-- Step 1: Ensure the helper function exists
CREATE OR REPLACE FUNCTION is_org_admin_safe(check_user_id uuid, check_org_id uuid)
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
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

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "admins_select_secure_final" ON public.admins;
DROP POLICY IF EXISTS "admins_select_secure" ON public.admins;
DROP POLICY IF EXISTS "admins_select" ON public.admins;
DROP POLICY IF EXISTS "admins_select_org_admins" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_secure_final" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_secure" ON public.admins;
DROP POLICY IF EXISTS "admins_insert" ON public.admins;
DROP POLICY IF EXISTS "admins_insert_org_admins" ON public.admins;
DROP POLICY IF EXISTS "admins_update_secure_final" ON public.admins;
DROP POLICY IF EXISTS "admins_update_secure" ON public.admins;
DROP POLICY IF EXISTS "admins_update" ON public.admins;
DROP POLICY IF EXISTS "admins_delete_secure_final" ON public.admins;
DROP POLICY IF EXISTS "admins_delete_secure" ON public.admins;
DROP POLICY IF EXISTS "admins_delete" ON public.admins;

-- Step 4: Create SELECT policy - allows org admins to see all admins in their org
CREATE POLICY "admins_select_org_admins" ON public.admins
FOR SELECT
TO authenticated
USING (
  -- Allow if user is an org admin for this org
  (scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id))
  OR
  -- Allow users to see their own admin records
  user_id = auth.uid()
  OR
  -- Allow if checking program-level admins (for program admin checks)
  scope_type = 'program'
);

-- Step 5: Create INSERT policy - allows org admins to add admins to their org
-- This is the key missing piece!
CREATE POLICY "admins_insert_org_admins" ON public.admins
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if adding to org where user is an org admin
  (scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id))
  OR
  -- Allow if adding to program where user is an org admin for that program's org
  (scope_type = 'program' AND EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = scope_id
    AND is_org_admin_safe(auth.uid(), p.organization_id)
  ))
);

-- Step 6: Create UPDATE policy - allows org admins to update admins in their org
CREATE POLICY "admins_update_org_admins" ON public.admins
FOR UPDATE
TO authenticated
USING (
  -- Allow if updating admins in org where user is an org admin
  (scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id))
  OR
  -- Allow users to update their own admin records
  user_id = auth.uid()
)
WITH CHECK (
  -- Same conditions for the new values
  (scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id))
  OR
  user_id = auth.uid()
);

-- Step 7: Create DELETE policy - allows org admins to remove admins from their org
CREATE POLICY "admins_delete_org_admins" ON public.admins
FOR DELETE
TO authenticated
USING (
  -- Allow if removing admins from org where user is an org admin
  (scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id))
  OR
  -- Allow users to delete their own admin records (though this is rare)
  user_id = auth.uid()
);

-- ============================================
-- ALSO FIX PROGRAMS TABLE (needed for reading team members)
-- ============================================

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "programs_select_org_admins" ON public.programs;
DROP POLICY IF EXISTS "programs_select" ON public.programs;

CREATE POLICY "programs_select_org_admins" ON public.programs
FOR SELECT
TO authenticated
USING (
  -- Allow if user is an org admin for this organization
  is_org_admin_safe(auth.uid(), organization_id)
  OR
  -- Also allow if program is published (for public viewing)
  published = true
  OR
  -- Allow if user is a reviewer or admin for this program
  EXISTS (
    SELECT 1 FROM public.reviewers r
    WHERE r.scope_type = 'program'
    AND r.scope_id = programs.id
    AND r.user_id = auth.uid()
    AND r.status = 'active'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.admins a
    WHERE a.scope_type = 'program'
    AND a.scope_id = programs.id
    AND a.user_id = auth.uid()
    AND a.status = 'active'
  )
);

-- ============================================
-- ALSO FIX REVIEWERS TABLE (for completeness)
-- ============================================

ALTER TABLE public.reviewers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviewers_select_org_admins" ON public.reviewers;

CREATE POLICY "reviewers_select_org_admins" ON public.reviewers
FOR SELECT
TO authenticated
USING (
  -- Allow if user is an org admin for the org that owns this program
  (scope_type = 'program' AND EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = reviewers.scope_id
    AND is_org_admin_safe(auth.uid(), p.organization_id)
  ))
  OR
  -- Allow if user is an org admin checking org-level reviewers
  (scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id))
  OR
  -- Allow users to see their own reviewer records
  user_id = auth.uid()
);

-- ============================================
-- VERIFICATION
-- ============================================
-- After running, test:
-- 1. SELECT * FROM pg_policies WHERE tablename = 'admins';
--    Should show: admins_select_org_admins, admins_insert_org_admins, admins_update_org_admins, admins_delete_org_admins
-- 2. Try: SELECT * FROM admins WHERE scope_type = 'org' LIMIT 1;
--    Should work if you're an org admin



