-- ============================================
-- BATCH ADD PROGRAM ASSIGNMENTS FUNCTION
-- Optimizes OrgMyTeams page by batching assignment additions
-- Adds user to multiple programs in one call
-- ============================================

CREATE OR REPLACE FUNCTION public.org_add_program_assignments_batch_v1(
  p_program_ids uuid[],
  p_user_email text,
  p_user_name text DEFAULT NULL,
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
      'added_count', 0
    );
  END IF;
  
  -- Validate assignment type
  IF p_assignment_type NOT IN ('reviewer', 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid assignment_type. Must be "reviewer" or "admin"',
      'added_count', 0
    );
  END IF;
  
  -- Process each program
  FOREACH v_program_id IN ARRAY p_program_ids
  LOOP
    BEGIN
      -- Check if program exists and is not deleted
      IF NOT EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = v_program_id
        AND p.deleted_at IS NULL
      ) THEN
        v_error_count := v_error_count + 1;
        v_errors := array_append(v_errors, 'Program ' || v_program_id || ' not found or deleted');
        CONTINUE;
      END IF;
      
      -- Add assignment based on type
      IF p_assignment_type = 'reviewer' THEN
        INSERT INTO public.reviewers (
          scope_type,
          scope_id,
          user_id,
          status
        ) VALUES (
          'program',
          v_program_id,
          v_user_id,
          'active'
        )
        ON CONFLICT (scope_type, scope_id, user_id)
        DO UPDATE SET status = 'active';
      ELSE -- admin
        INSERT INTO public.admins (
          scope_type,
          scope_id,
          user_id,
          status
        ) VALUES (
          'program',
          v_program_id,
          v_user_id,
          'active'
        )
        ON CONFLICT (scope_type, scope_id, user_id)
        DO UPDATE SET status = 'active';
      END IF;
      
      v_success_count := v_success_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        v_errors := array_append(v_errors, 'Program ' || v_program_id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  -- Update profile name if provided (only once, not per program)
  IF p_user_name IS NOT NULL THEN
    UPDATE public.profiles
    SET full_name = p_user_name
    WHERE id = v_user_id
    AND (full_name IS NULL OR full_name != p_user_name);
  END IF;
  
  -- Return result
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'added_count', v_success_count,
    'error_count', v_error_count,
    'errors', CASE WHEN array_length(v_errors, 1) > 0 THEN v_errors ELSE NULL END,
    'message', format('Added %s to %s programs', p_assignment_type, v_success_count)
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.org_add_program_assignments_batch_v1(uuid[], text, text, text) TO authenticated;

