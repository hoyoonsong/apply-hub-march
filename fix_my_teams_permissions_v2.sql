-- ============================================
-- FIXED VERSION: MY TEAMS PAGE PERMISSIONS
-- More robust - handles edge cases and conflicts
-- ============================================

-- Step 1: Ensure the helper function exists and works
-- This function safely checks if a user is an org admin without recursion
CREATE OR REPLACE FUNCTION is_org_admin_safe(check_user_id uuid, check_org_id uuid)
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- SECURITY DEFINER allows this to bypass RLS when checking admin status
  -- STABLE means it won't change within a transaction (better for RLS)
  RETURN EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = check_user_id 
    AND scope_type = 'org' 
    AND scope_id = check_org_id
    AND status = 'active'
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_org_admin_safe(uuid, uuid) TO authenticated;

-- Step 2: Ensure RLS is enabled on admins table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL existing conflicting policies on admins table
DROP POLICY IF EXISTS "admins_select_secure_final" ON public.admins;
DROP POLICY IF EXISTS "admins_select_secure" ON public.admins;
DROP POLICY IF EXISTS "admins_select" ON public.admins;
DROP POLICY IF EXISTS "admins_select_org_admins" ON public.admins;

-- Step 4: Create a single, clear SELECT policy for admins table
-- This allows org admins to see all admins in their org
CREATE POLICY "admins_select_org_admins" ON public.admins
FOR SELECT
TO authenticated
USING (
  -- Allow if user is an org admin for this org (using safe function)
  (scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id))
  OR
  -- Allow users to see their own admin records
  user_id = auth.uid()
  OR
  -- Allow if checking program-level admins (for program admin checks)
  scope_type = 'program'
);

-- Step 5: Ensure RLS is enabled on programs table
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing conflicting policies on programs table
DROP POLICY IF EXISTS "programs_select_org_admins" ON public.programs;
DROP POLICY IF EXISTS "programs_select" ON public.programs;

-- Step 7: Create SELECT policy for programs table
-- This allows org admins to see programs in their org
CREATE POLICY "programs_select_org_admins" ON public.programs
FOR SELECT
TO authenticated
USING (
  -- Allow if user is an org admin for this organization
  is_org_admin_safe(auth.uid(), organization_id)
  OR
  -- Also allow if program is published (for public viewing - preserves existing behavior)
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

-- Step 8: Ensure RLS is enabled on reviewers table (needed for program checks)
ALTER TABLE public.reviewers ENABLE ROW LEVEL SECURITY;

-- Step 9: Ensure reviewers table has a policy for program-level access
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "reviewers_select_org_admins" ON public.reviewers;

-- Create policy that allows org admins to see reviewers in their org's programs
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

-- Step 10: Ensure the RPC function exists and has proper grants
-- Check if function exists, if not we'll need to create it
DO $$
BEGIN
  -- Check if function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'org_list_program_assignments'
    AND pg_get_function_identity_arguments(oid) = 'p_program_id uuid'
  ) THEN
    RAISE NOTICE 'org_list_program_assignments function does not exist - you may need to create it';
  ELSE
    -- Function exists, just ensure grants
    GRANT EXECUTE ON FUNCTION org_list_program_assignments(UUID) TO authenticated;
    RAISE NOTICE 'org_list_program_assignments function exists and grants verified';
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this, check:
-- 1. Policies were created: SELECT * FROM pg_policies WHERE tablename IN ('admins', 'programs', 'reviewers');
-- 2. RLS is enabled: SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('admins', 'programs', 'reviewers');
-- 3. Function exists: SELECT proname FROM pg_proc WHERE proname = 'is_org_admin_safe';


