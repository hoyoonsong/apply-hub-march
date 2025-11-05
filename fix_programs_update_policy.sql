-- ============================================
-- FIX: Add UPDATE policy for programs table
-- This allows org admins to update programs in their org
-- ============================================

-- Ensure the helper function exists (it should from org_admin_simple_permissions.sql)
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

-- Ensure RLS is enabled
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Drop any existing UPDATE policy on programs (if it exists)
DROP POLICY IF EXISTS "programs_update_simple" ON public.programs;

-- CREATE UPDATE policy: Org admins can update programs in their org
CREATE POLICY "programs_update_simple" ON public.programs
FOR UPDATE
TO authenticated
USING (
  -- Org admins can update programs in their org (uses SECURITY DEFINER, no recursion)
  is_org_admin_safe(auth.uid(), organization_id)
)
WITH CHECK (
  -- Same check for WITH CHECK clause
  is_org_admin_safe(auth.uid(), organization_id)
);

-- Also add INSERT policy if needed (for creating new programs)
DROP POLICY IF EXISTS "programs_insert_simple" ON public.programs;
CREATE POLICY "programs_insert_simple" ON public.programs
FOR INSERT
TO authenticated
WITH CHECK (
  is_org_admin_safe(auth.uid(), organization_id)
);

-- Also add DELETE policy if needed (for soft/hard deletes)
DROP POLICY IF EXISTS "programs_delete_simple" ON public.programs;
CREATE POLICY "programs_delete_simple" ON public.programs
FOR DELETE
TO authenticated
USING (
  is_org_admin_safe(auth.uid(), organization_id)
);

