-- FORCE FIX ALL ASSIGNMENT FUNCTIONS
-- This will completely replace all functions

-- Drop ALL existing functions first
DROP FUNCTION IF EXISTS find_user_by_email(TEXT);
DROP FUNCTION IF EXISTS org_add_program_reviewer(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS org_add_program_admin(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS org_remove_program_reviewer(UUID, TEXT);
DROP FUNCTION IF EXISTS org_remove_program_admin(UUID, TEXT);
DROP FUNCTION IF EXISTS org_list_program_assignments(UUID);

-- 1. Find user by email
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

-- 2. Add reviewer to program
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
  
  -- Check if program exists
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
  
  -- Insert reviewer assignment
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
  );
  
  -- Update profile name if provided
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
EXCEPTION
  WHEN unique_violation THEN
    -- If user is already a reviewer, just update status
    UPDATE public.reviewers
    SET status = 'active'
    WHERE scope_type = 'program'
    AND scope_id = p_program_id
    AND user_id = user_id;
    
    RETURN json_build_object(
      'success', true,
      'user_id', user_id,
      'message', 'Reviewer updated successfully'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Database error: ' || SQLERRM
    );
END;
$$;

-- 3. Add admin to program
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
  
  -- Check if program exists
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
  
  -- Insert admin assignment
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
  );
  
  -- Update profile name if provided
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
EXCEPTION
  WHEN unique_violation THEN
    -- If user is already an admin, just update status
    UPDATE public.admins
    SET status = 'active'
    WHERE scope_type = 'program'
    AND scope_id = p_program_id
    AND user_id = user_id;
    
    RETURN json_build_object(
      'success', true,
      'user_id', user_id,
      'message', 'Admin updated successfully'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Database error: ' || SQLERRM
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

-- 6. List program assignments (FIXED - no ambiguous columns)
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
    'reviewers', COALESCE((
      SELECT json_agg(
        json_build_object(
          'user_id', r.user_id,
          'email', u.email,
          'full_name', p.full_name,
          'status', r.status,
          'created_at', r.created_at
        )
      )
      FROM public.reviewers r
      JOIN auth.users u ON u.id = r.user_id
      LEFT JOIN public.profiles p ON p.id = r.user_id
      WHERE r.scope_type = 'program'
      AND r.scope_id = p_program_id
      AND r.status = 'active'
    ), '[]'::json),
    'admins', COALESCE((
      SELECT json_agg(
        json_build_object(
          'user_id', a.user_id,
          'email', u.email,
          'full_name', p.full_name,
          'status', a.status,
          'created_at', a.created_at
        )
      )
      FROM public.admins a
      JOIN auth.users u ON u.id = a.user_id
      LEFT JOIN public.profiles p ON p.id = a.user_id
      WHERE a.scope_type = 'program'
      AND a.scope_id = p_program_id
      AND a.status = 'active'
    ), '[]'::json)
  ) INTO result;
  
  RETURN COALESCE(result, json_build_object('reviewers', '[]'::json, 'admins', '[]'::json));
END;
$$;

-- Grant all permissions
GRANT EXECUTE ON FUNCTION find_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_add_program_reviewer(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_add_program_admin(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_remove_program_reviewer(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_remove_program_admin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_list_program_assignments(UUID) TO authenticated;
