-- ============================================
-- SIMPLE ORG ADMIN PERMISSIONS - NO RECURSION
-- Allows org admins to manage their teams without infinite recursion
-- ============================================

-- Step 1: Create helper function that bypasses RLS completely
CREATE OR REPLACE FUNCTION is_org_admin_safe(check_user_id uuid, check_org_id uuid)
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- SECURITY DEFINER bypasses ALL RLS - this is safe and prevents recursion
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

-- ============================================
-- ADMINS TABLE - Simple policies
-- ============================================

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on admins
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'admins') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.admins', r.policyname);
    END LOOP;
END $$;

-- SELECT: Org admins can see admins in their org
CREATE POLICY "admins_select_simple" ON public.admins
FOR SELECT
TO authenticated
USING (
  (scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id))
  OR user_id = auth.uid()
  OR scope_type = 'program'
);

-- INSERT: Org admins can add admins to their org
CREATE POLICY "admins_insert_simple" ON public.admins
FOR INSERT
TO authenticated
WITH CHECK (
  scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id)
);

-- UPDATE: Org admins can update admins in their org
CREATE POLICY "admins_update_simple" ON public.admins
FOR UPDATE
TO authenticated
USING (
  scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id)
)
WITH CHECK (
  scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id)
);

-- DELETE: Org admins can remove admins from their org
CREATE POLICY "admins_delete_simple" ON public.admins
FOR DELETE
TO authenticated
USING (
  scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id)
);

-- ============================================
-- PROGRAMS TABLE - Simple policy, NO recursion
-- ============================================

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on programs
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'programs') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.programs', r.policyname);
    END LOOP;
END $$;

-- Simple SELECT policy - ONLY check org admin, don't query other tables
CREATE POLICY "programs_select_simple" ON public.programs
FOR SELECT
TO authenticated
USING (
  -- Org admins can see programs in their org (uses SECURITY DEFINER, no recursion)
  is_org_admin_safe(auth.uid(), organization_id)
  OR
  -- Published programs are public
  published = true
);

-- ============================================
-- REVIEWERS TABLE - Simple policies
-- ============================================

ALTER TABLE public.reviewers ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on reviewers
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'reviewers') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.reviewers', r.policyname);
    END LOOP;
END $$;

-- Helper function to check if user is org admin for a program's org
-- This avoids recursion by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_org_admin_for_program(check_user_id uuid, program_id uuid)
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  org_id uuid;
BEGIN
  -- Get the org_id for this program (bypasses RLS)
  SELECT organization_id INTO org_id
  FROM public.programs
  WHERE id = program_id;
  
  IF org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is org admin (bypasses RLS)
  RETURN EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = check_user_id 
    AND scope_type = 'org' 
    AND scope_id = org_id
    AND status = 'active'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_org_admin_for_program(uuid, uuid) TO authenticated;

-- SELECT: Org admins can see reviewers for programs in their org
CREATE POLICY "reviewers_select_simple" ON public.reviewers
FOR SELECT
TO authenticated
USING (
  (scope_type = 'program' AND is_org_admin_for_program(auth.uid(), scope_id))
  OR (scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id))
  OR user_id = auth.uid()
);

-- INSERT: Org admins can add reviewers to programs in their org
CREATE POLICY "reviewers_insert_simple" ON public.reviewers
FOR INSERT
TO authenticated
WITH CHECK (
  (scope_type = 'program' AND is_org_admin_for_program(auth.uid(), scope_id))
  OR (scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id))
);

-- UPDATE: Org admins can update reviewers for programs in their org
CREATE POLICY "reviewers_update_simple" ON public.reviewers
FOR UPDATE
TO authenticated
USING (
  (scope_type = 'program' AND is_org_admin_for_program(auth.uid(), scope_id))
  OR (scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id))
)
WITH CHECK (
  (scope_type = 'program' AND is_org_admin_for_program(auth.uid(), scope_id))
  OR (scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id))
);

-- DELETE: Org admins can remove reviewers from programs in their org
CREATE POLICY "reviewers_delete_simple" ON public.reviewers
FOR DELETE
TO authenticated
USING (
  (scope_type = 'program' AND is_org_admin_for_program(auth.uid(), scope_id))
  OR (scope_type = 'org' AND is_org_admin_safe(auth.uid(), scope_id))
);

