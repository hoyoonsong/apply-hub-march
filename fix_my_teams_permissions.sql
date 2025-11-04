-- ============================================
-- MINIMAL FIX FOR "MY TEAMS" PAGE 403 ERRORS
-- ============================================
-- This fixes the 403 Forbidden errors when loading team members
-- without breaking any existing functionality
--
-- WHY WE NEED THIS:
-- 1. The page queries the 'admins' table to get org admins - needs RLS policy
-- 2. The page queries the 'programs' table to get org programs - needs RLS policy  
-- 3. The RPC function needs proper grants to be callable
-- ============================================

-- Step 1: Ensure the helper function exists (for RLS policies)
-- This function safely checks if a user is an org admin without recursion
CREATE OR REPLACE FUNCTION is_org_admin_safe(check_user_id uuid, check_org_id uuid)
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SECURITY DEFINER allows this to bypass RLS when checking admin status
  -- This prevents infinite recursion in RLS policies
  RETURN EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = check_user_id 
    AND scope_type = 'org' 
    AND scope_id = check_org_id
    AND status = 'active'
  );
END;
$$;

-- Step 2: Fix RLS policy for 'admins' table to allow org admins to read
-- This allows org admins to see all admins in their organization
-- WHY: The page needs to query admins table to list org admins (line 90-94 in OrgMyTeams.tsx)
DO $$
BEGIN
  -- Drop existing conflicting policies if they exist
  DROP POLICY IF EXISTS "admins_select_secure_final" ON public.admins;
  DROP POLICY IF EXISTS "admins_select_secure" ON public.admins;
  DROP POLICY IF EXISTS "admins_select" ON public.admins;
  
  -- Create a single clear policy that allows:
  -- 1. Org admins to see all admins in their org
  -- 2. Users to see their own admin records
  CREATE POLICY "admins_select_org_admins" ON public.admins
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if user is an org admin for this org (using safe function)
    (scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id))
    OR
    -- Allow users to see their own admin records
    user_id = auth.uid()
  );
  
EXCEPTION WHEN OTHERS THEN
  -- If RLS is not enabled, just note it
  RAISE NOTICE 'RLS might not be enabled on admins table';
END $$;

-- Step 3: Ensure RLS is enabled on admins table (if not already)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Step 4: Fix RLS policy for 'programs' table to allow org admins to read
-- This allows org admins to see all programs in their organization
-- WHY: The page needs to query programs table to get all org programs (line 99-103 in OrgMyTeams.tsx)
DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "programs_select_org_admins" ON public.programs;
  
  -- Create policy that allows org admins to see programs in their org
  CREATE POLICY "programs_select_org_admins" ON public.programs
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if user is an org admin for this organization
    is_org_admin_safe(auth.uid(), organization_id)
    OR
    -- Also allow if program is published (for public viewing)
    published = true
  );
  
EXCEPTION WHEN OTHERS THEN
  -- If RLS is not enabled, just note it
  RAISE NOTICE 'RLS might not be enabled on programs table';
END $$;

-- Step 5: Ensure RLS is enabled on programs table (if not already)
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Step 6: Ensure the RPC function has proper grants
-- WHY: The page calls org_list_program_assignments for each program (line 130-135 in OrgMyTeams.tsx)
-- This function is already SECURITY DEFINER, but we need to ensure it's granted
GRANT EXECUTE ON FUNCTION org_list_program_assignments(UUID) TO authenticated;

-- ============================================
-- VERIFICATION QUERIES (optional - run these to check)
-- ============================================
-- Check if policies exist:
-- SELECT * FROM pg_policies WHERE tablename IN ('admins', 'programs');
--
-- Check if function exists:
-- SELECT proname FROM pg_proc WHERE proname = 'is_org_admin_safe';
--
-- Check if RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('admins', 'programs');

