-- JUST FIX THE REMOVE FUNCTION
-- This only touches the remove functions, nothing else

-- Drop only the remove functions
DROP FUNCTION IF EXISTS org_remove_program_reviewer(UUID, TEXT);
DROP FUNCTION IF EXISTS org_remove_program_admin(UUID, TEXT);

-- Fix remove reviewer function
CREATE OR REPLACE FUNCTION org_remove_program_reviewer(
  p_program_id UUID,
  p_user_email TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  rows_updated INTEGER;
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
  
  -- Revoke reviewer assignment and get count of affected rows
  UPDATE public.reviewers
  SET status = 'revoked'
  WHERE scope_type = 'program'
  AND scope_id = p_program_id
  AND user_id = user_id;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  -- Check if any rows were actually updated
  IF rows_updated = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Reviewer not found for this program'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Reviewer removed successfully'
  );
END;
$$;

-- Fix remove admin function
CREATE OR REPLACE FUNCTION org_remove_program_admin(
  p_program_id UUID,
  p_user_email TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  rows_updated INTEGER;
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
  
  -- Revoke admin assignment and get count of affected rows
  UPDATE public.admins
  SET status = 'revoked'
  WHERE scope_type = 'program'
  AND scope_id = p_program_id
  AND user_id = user_id;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  -- Check if any rows were actually updated
  IF rows_updated = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Admin not found for this program'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Admin removed successfully'
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION org_remove_program_reviewer(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION org_remove_program_admin(UUID, TEXT) TO authenticated;
