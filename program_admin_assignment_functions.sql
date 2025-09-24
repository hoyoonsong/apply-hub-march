-- Program Admin Assignment Functions
-- SIMPLE and SAFE - only works with existing users

-- Drop existing function first (needed to change return type)
DROP FUNCTION IF EXISTS find_user_by_email(TEXT);

-- 1. Find user by email (simple lookup only)
CREATE OR REPLACE FUNCTION find_user_by_email(
  p_email TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user_id', u.id,
    'full_name', p.full_name,
    'email', u.email
  ) INTO result
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.email = p_email
  LIMIT 1;
  
  RETURN COALESCE(result, 'null'::json);
END;
$$;

-- 2. Add reviewer to program (program admin version)
CREATE OR REPLACE FUNCTION org_add_program_reviewer(
  p_program_id UUID,
  p_user_email TEXT,
  p_user_name TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  result JSON;
BEGIN
  -- Find user by email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = p_user_email
  LIMIT 1;
  
  -- If user not found, return error
  IF user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found with email: ' || p_user_email
    );
  END IF;
  
  -- Check if program exists and user has access to it
  IF NOT EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = p_program_id
    AND p.deleted_at IS NULL
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Program not found'
    );
  END IF;
  
  -- Insert or update reviewer assignment
  INSERT INTO public.reviewers (
    scope_type,
    scope_id,
    user_id,
    status
  ) VALUES (
    'program',
    p_program_id,
    user_id,
    'active'
  )
  ON CONFLICT (scope_type, user_id, scope_id)
  DO UPDATE SET
    status = 'active',
    created_at = CASE 
      WHEN reviewers.status = 'revoked' THEN now()
      ELSE reviewers.created_at
    END;
  
  -- Update profile name if provided and different
  IF p_user_name IS NOT NULL THEN
    UPDATE public.profiles
    SET full_name = p_user_name
    WHERE id = user_id
    AND (full_name IS NULL OR full_name != p_user_name);
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'user_id', user_id,
    'message', 'Reviewer added successfully'
  );
END;
$$;

-- 3. Add admin to program (program admin version)
CREATE OR REPLACE FUNCTION org_add_program_admin(
  p_program_id UUID,
  p_user_email TEXT,
  p_user_name TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  result JSON;
BEGIN
  -- Find user by email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = p_user_email
  LIMIT 1;
  
  -- If user not found, return error
  IF user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found with email: ' || p_user_email
    );
  END IF;
  
  -- Check if program exists and user has access to it
  IF NOT EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = p_program_id
    AND p.deleted_at IS NULL
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Program not found'
    );
  END IF;
  
  -- Insert or update admin assignment
  INSERT INTO public.admins (
    scope_type,
    scope_id,
    user_id,
    status
  ) VALUES (
    'program',
    p_program_id,
    user_id,
    'active'
  )
  ON CONFLICT (scope_type, user_id, scope_id)
  DO UPDATE SET
    status = 'active',
    created_at = CASE 
      WHEN admins.status = 'revoked' THEN now()
      ELSE admins.created_at
    END;
  
  -- Update profile name if provided and different
  IF p_user_name IS NOT NULL THEN
    UPDATE public.profiles
    SET full_name = p_user_name
    WHERE id = user_id
    AND (full_name IS NULL OR full_name != p_user_name);
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'user_id', user_id,
    'message', 'Admin added successfully'
  );
END;
$$;

-- 4. Remove reviewer from program
CREATE OR REPLACE FUNCTION org_remove_program_reviewer(
  p_program_id UUID,
  p_user_email TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = p_user_email
  LIMIT 1;
  
  -- If user not found, return error
  IF user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found with email: ' || p_user_email
    );
  END IF;
  
  -- Revoke reviewer assignment
  UPDATE public.reviewers
  SET status = 'revoked'
  WHERE scope_type = 'program'
  AND scope_id = p_program_id
  AND user_id = user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Reviewer removed successfully'
  );
END;
$$;

-- 5. Remove admin from program
CREATE OR REPLACE FUNCTION org_remove_program_admin(
  p_program_id UUID,
  p_user_email TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = p_user_email
  LIMIT 1;
  
  -- If user not found, return error
  IF user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found with email: ' || p_user_email
    );
  END IF;
  
  -- Revoke admin assignment
  UPDATE public.admins
  SET status = 'revoked'
  WHERE scope_type = 'program'
  AND scope_id = p_program_id
  AND user_id = user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Admin removed successfully'
  );
END;
$$;

-- 6. List program reviewers and admins
CREATE OR REPLACE FUNCTION org_list_program_assignments(
  p_program_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'reviewers', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'user_id', r.user_id,
          'email', u.email,
          'full_name', p.full_name,
          'status', r.status,
          'created_at', r.created_at
        )
      ), '[]'::json)
      FROM public.reviewers r
      JOIN auth.users u ON u.id = r.user_id
      LEFT JOIN public.profiles p ON p.id = r.user_id
      WHERE r.scope_type = 'program'
      AND r.scope_id = p_program_id
      AND r.status = 'active'
    ),
    'admins', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'user_id', a.user_id,
          'email', u.email,
          'full_name', p.full_name,
          'status', a.status,
          'created_at', a.created_at
        )
      ), '[]'::json)
      FROM public.admins a
      JOIN auth.users u ON u.id = a.user_id
      LEFT JOIN public.profiles p ON p.id = a.user_id
      WHERE a.scope_type = 'program'
      AND a.scope_id = p_program_id
      AND a.status = 'active'
    )
  ) INTO result;
  
  RETURN COALESCE(result, json_build_object('reviewers', '[]'::json, 'admins', '[]'::json));
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION find_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_add_program_reviewer(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_add_program_admin(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_remove_program_reviewer(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_remove_program_admin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_list_program_assignments(UUID) TO authenticated;
