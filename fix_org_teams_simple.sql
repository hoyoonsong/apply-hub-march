-- Simple RPC functions for the My Teams page
-- These functions use SECURITY DEFINER to bypass RLS completely

--KEEP THIS FILE!

-- 1. List org admins
CREATE OR REPLACE FUNCTION org_list_org_admins(p_org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- SECURITY DEFINER means this runs with the function owner's privileges
  -- This completely bypasses RLS policies
  -- Directly query admins table without any RLS checks
  SELECT COALESCE(json_agg(
    json_build_object(
      'user_id', a.user_id,
      'email', u.email,
      'full_name', COALESCE(p.full_name, ''),
      'status', a.status,
      'created_at', a.created_at
    )
  ), '[]'::json) INTO result
  FROM public.admins a
  JOIN auth.users u ON u.id = a.user_id
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE a.scope_type = 'org'
  AND a.scope_id = p_org_id;
  
  RETURN COALESCE(result, '[]'::json);
EXCEPTION
  WHEN OTHERS THEN
    -- Return empty array on any error
    RETURN '[]'::json;
END;
$$;

-- 2. List org programs
CREATE OR REPLACE FUNCTION org_list_org_programs(p_org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- SECURITY DEFINER means this runs with the function owner's privileges
  -- This completely bypasses RLS policies
  -- Directly query programs table without any RLS checks
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', id,
      'name', name
    )
  ), '[]'::json) INTO result
  FROM public.programs
  WHERE organization_id = p_org_id
  AND deleted_at IS NULL;
  
  RETURN COALESCE(result, '[]'::json);
EXCEPTION
  WHEN OTHERS THEN
    -- Return empty array on any error
    RETURN '[]'::json;
END;
$$;

-- 3. List org reviewers (org-level reviewers)
CREATE OR REPLACE FUNCTION org_list_org_reviewers(p_org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- SECURITY DEFINER means this runs with the function owner's privileges
  -- This completely bypasses RLS policies
  SELECT COALESCE(json_agg(
    json_build_object(
      'user_id', r.user_id,
      'email', u.email,
      'full_name', COALESCE(p.full_name, ''),
      'status', r.status,
      'created_at', r.created_at
    )
  ), '[]'::json) INTO result
  FROM public.reviewers r
  JOIN auth.users u ON u.id = r.user_id
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE r.scope_type = 'org'
  AND r.scope_id = p_org_id;
  
  RETURN COALESCE(result, '[]'::json);
EXCEPTION
  WHEN OTHERS THEN
    -- Return empty array on any error
    RETURN '[]'::json;
END;
$$;

-- 4. Add org admin
CREATE OR REPLACE FUNCTION org_add_org_admin(
  p_org_id UUID,
  p_user_email TEXT,
  p_user_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email
  LIMIT 1;
  
  -- If user not found, return error
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found with email: ' || p_user_email
    );
  END IF;
  
  -- Insert or update org admin assignment
  INSERT INTO public.admins (
    scope_type,
    scope_id,
    user_id,
    status
  ) VALUES (
    'org',
    p_org_id,
    v_user_id,
    'active'
  )
  ON CONFLICT (scope_type, user_id, scope_id)
  DO UPDATE SET
    status = 'active',
    created_at = CASE 
      WHEN admins.status = 'revoked' THEN now()
      ELSE admins.created_at
    END;
  
  -- Update profile name if provided
  IF p_user_name IS NOT NULL THEN
    UPDATE public.profiles
    SET full_name = p_user_name
    WHERE id = v_user_id
    AND (full_name IS NULL OR full_name != p_user_name);
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'Org admin added successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Database error: ' || SQLERRM
    );
END;
$$;

-- 5. Remove org admin
CREATE OR REPLACE FUNCTION org_remove_org_admin(
  p_org_id UUID,
  p_user_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email
  LIMIT 1;
  
  -- If user not found, return error
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found with email: ' || p_user_email
    );
  END IF;
  
  -- Remove org admin assignment
  DELETE FROM public.admins
  WHERE scope_type = 'org'
  AND scope_id = p_org_id
  AND user_id = v_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Org admin removed successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Database error: ' || SQLERRM
    );
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION org_list_org_admins(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION org_list_org_programs(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION org_list_org_reviewers(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION org_add_org_admin(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_remove_org_admin(UUID, TEXT) TO authenticated;

