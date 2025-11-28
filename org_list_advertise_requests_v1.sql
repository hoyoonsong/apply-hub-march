-- Simple RPC function for org admins to get their advertise requests
DROP FUNCTION IF EXISTS org_list_advertise_requests_v1(uuid);

CREATE OR REPLACE FUNCTION org_list_advertise_requests_v1(p_org_id uuid)
RETURNS SETOF public.superadmin_forms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT can_manage_org_admins(p_org_id) THEN
    RAISE EXCEPTION 'Access denied. Org admin access required.';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.superadmin_forms
  WHERE form_type = 'advertise'
  AND (form_data->>'organization_id')::uuid = p_org_id
  ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION org_list_advertise_requests_v1(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION org_list_advertise_requests_v1(uuid) TO authenticated;

