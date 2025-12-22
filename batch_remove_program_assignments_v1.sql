-- ============================================
-- BATCH REMOVE PROGRAM ASSIGNMENTS FUNCTION
-- Optimizes OrgMyTeams page by batching assignment removals
-- Removes user from multiple programs in one call
-- ============================================

CREATE OR REPLACE FUNCTION public.org_remove_program_assignments_batch_v1(
  p_program_ids uuid[],
  p_user_email text,
  p_assignment_type text DEFAULT 'reviewer' -- 'reviewer' or 'admin'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_success_count integer := 0;
  v_error_count integer := 0;
  v_errors text[] := ARRAY[]::text[];
  v_program_id uuid;
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
      'error', 'User not found with email: ' || p_user_email,
      'removed_count', 0
    );
  END IF;
  
  -- Validate assignment type
  IF p_assignment_type NOT IN ('reviewer', 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid assignment_type. Must be "reviewer" or "admin"',
      'removed_count', 0
    );
  END IF;
  
  -- Process each program
  FOREACH v_program_id IN ARRAY p_program_ids
  LOOP
    BEGIN
      -- Remove assignment based on type
      IF p_assignment_type = 'reviewer' THEN
        UPDATE public.reviewers
        SET status = 'revoked'
        WHERE scope_type = 'program'
        AND scope_id = v_program_id
        AND user_id = v_user_id;
      ELSE -- admin
        UPDATE public.admins
        SET status = 'revoked'
        WHERE scope_type = 'program'
        AND scope_id = v_program_id
        AND user_id = v_user_id;
      END IF;
      
      -- Check if any rows were updated
      IF FOUND THEN
        v_success_count := v_success_count + 1;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        v_errors := array_append(v_errors, 'Program ' || v_program_id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  -- Return result
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'removed_count', v_success_count,
    'error_count', v_error_count,
    'errors', CASE WHEN array_length(v_errors, 1) > 0 THEN v_errors ELSE NULL END,
    'message', format('Removed %s from %s programs', p_assignment_type, v_success_count)
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.org_remove_program_assignments_batch_v1(uuid[], text, text) TO authenticated;

