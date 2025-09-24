-- FINAL FIX - THIS WILL WORK
-- Drop everything and recreate it properly

-- Drop all functions completely
DROP FUNCTION IF EXISTS find_user_by_email(TEXT) CASCADE;
DROP FUNCTION IF EXISTS org_add_program_reviewer(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS org_add_program_admin(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS org_remove_program_reviewer(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS org_remove_program_admin(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS org_list_program_assignments(UUID) CASCADE;

-- 1. Find user by email - SIMPLE VERSION
CREATE FUNCTION find_user_by_email(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user_id', u.id,
    'full_name', COALESCE(p.full_name, ''),
    'email', u.email
  ) INTO result
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.email = p_email;
  
  RETURN COALESCE(result, 'null'::json);
END;
$$;

-- 2. Add reviewer - SIMPLE VERSION
CREATE FUNCTION org_add_program_reviewer(p_program_id UUID, p_user_email TEXT, p_user_name TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO user_id FROM auth.users WHERE email = p_user_email LIMIT 1;
  
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Insert or update reviewer
  INSERT INTO public.reviewers (scope_type, scope_id, user_id, status)
  VALUES ('program', p_program_id, user_id, 'active')
  ON CONFLICT (scope_type, scope_id, user_id) 
  DO UPDATE SET status = 'active';
  
  -- Update name if provided
  IF p_user_name IS NOT NULL THEN
    UPDATE public.profiles SET full_name = p_user_name WHERE id = user_id;
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Reviewer added');
END;
$$;

-- 3. Add admin - SIMPLE VERSION
CREATE FUNCTION org_add_program_admin(p_program_id UUID, p_user_email TEXT, p_user_name TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO user_id FROM auth.users WHERE email = p_user_email LIMIT 1;
  
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Insert or update admin
  INSERT INTO public.admins (scope_type, scope_id, user_id, status)
  VALUES ('program', p_program_id, user_id, 'active')
  ON CONFLICT (scope_type, scope_id, user_id) 
  DO UPDATE SET status = 'active';
  
  -- Update name if provided
  IF p_user_name IS NOT NULL THEN
    UPDATE public.profiles SET full_name = p_user_name WHERE id = user_id;
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Admin added');
END;
$$;

-- 4. Remove reviewer - SIMPLE VERSION
CREATE FUNCTION org_remove_program_reviewer(p_program_id UUID, p_user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO user_id FROM auth.users WHERE email = p_user_email LIMIT 1;
  
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Update status to revoked
  UPDATE public.reviewers 
  SET status = 'revoked'
  WHERE scope_type = 'program' 
  AND scope_id = p_program_id 
  AND user_id = user_id;
  
  RETURN json_build_object('success', true, 'message', 'Reviewer removed');
END;
$$;

-- 5. Remove admin - SIMPLE VERSION
CREATE FUNCTION org_remove_program_admin(p_program_id UUID, p_user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO user_id FROM auth.users WHERE email = p_user_email LIMIT 1;
  
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Update status to revoked
  UPDATE public.admins 
  SET status = 'revoked'
  WHERE scope_type = 'program' 
  AND scope_id = p_program_id 
  AND user_id = user_id;
  
  RETURN json_build_object('success', true, 'message', 'Admin removed');
END;
$$;

-- 6. List assignments - FIXED VERSION
CREATE FUNCTION org_list_program_assignments(p_program_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reviewers_json JSON;
  admins_json JSON;
BEGIN
  -- Get reviewers
  SELECT COALESCE(json_agg(
    json_build_object(
      'user_id', r.user_id,
      'email', u.email,
      'full_name', COALESCE(p.full_name, ''),
      'status', r.status,
      'created_at', r.created_at
    )
  ), '[]'::json) INTO reviewers_json
  FROM public.reviewers r
  JOIN auth.users u ON u.id = r.user_id
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE r.scope_type = 'program'
  AND r.scope_id = p_program_id
  AND r.status = 'active';
  
  -- Get admins
  SELECT COALESCE(json_agg(
    json_build_object(
      'user_id', a.user_id,
      'email', u.email,
      'full_name', COALESCE(p.full_name, ''),
      'status', a.status,
      'created_at', a.created_at
    )
  ), '[]'::json) INTO admins_json
  FROM public.admins a
  JOIN auth.users u ON u.id = a.user_id
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE a.scope_type = 'program'
  AND a.scope_id = p_program_id
  AND a.status = 'active';
  
  RETURN json_build_object(
    'reviewers', reviewers_json,
    'admins', admins_json
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION find_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_add_program_reviewer(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_add_program_admin(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_remove_program_reviewer(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_remove_program_admin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_list_program_assignments(UUID) TO authenticated;
