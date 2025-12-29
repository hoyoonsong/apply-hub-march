-- ============================================
-- ADD UPDATE POLICY FOR ORGANIZATIONS TABLE
-- Allows org admins to update their own organization
-- ============================================

-- Simple helper function: Check if user is org admin for a specific org
-- This avoids RLS issues with superadmins table
CREATE OR REPLACE FUNCTION is_org_admin_safe(check_user_id uuid, check_org_id uuid)
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Simply check if user is an org admin for this specific organization
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

-- Ensure RLS is enabled on organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on organizations (if they exist)
DROP POLICY IF EXISTS "organizations_select_public" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_org_admins" ON public.organizations;

-- CREATE SELECT policy: Allow public (anonymous) access to organizations
-- This is needed for public pages like /org/:slug
CREATE POLICY "organizations_select_public" ON public.organizations
FOR SELECT
TO anon, authenticated
USING (
  -- Everyone can see non-deleted organizations
  -- (Superadmins can see deleted ones if they're also org admins, or via super admin interface)
  deleted_at IS NULL
);

-- CREATE UPDATE policy: Org admins can update their own organization
CREATE POLICY "organizations_update_org_admins" ON public.organizations
FOR UPDATE
TO authenticated
USING (
  -- Org admins can update their own organization
  is_org_admin_safe(auth.uid(), id)
)
WITH CHECK (
  -- Same check for WITH CHECK clause
  is_org_admin_safe(auth.uid(), id)
);

