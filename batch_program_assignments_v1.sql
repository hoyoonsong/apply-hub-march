-- ============================================
-- BATCH PROGRAM ASSIGNMENTS FUNCTION
-- Optimizes OrgMyTeams page by batching assignment queries
-- Returns assignments for multiple programs in one call
-- ============================================

CREATE OR REPLACE FUNCTION public.org_list_program_assignments_batch_v1(
  p_program_ids uuid[]
)
RETURNS TABLE (
  program_id uuid,
  assignments json
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return assignments for all programs in one query
  RETURN QUERY
  SELECT 
    p.id AS program_id,
    json_build_object(
      'reviewers', COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'user_id', r.user_id,
              'email', u.email,
              'full_name', COALESCE(prof.full_name, ''),
              'status', r.status,
              'created_at', r.created_at
            )
          )
          FROM public.reviewers r
          JOIN auth.users u ON u.id = r.user_id
          LEFT JOIN public.profiles prof ON prof.id = r.user_id
          WHERE r.scope_type = 'program'
          AND r.scope_id = p.id
          AND r.status = 'active'
        ),
        '[]'::json
      ),
      'admins', COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'user_id', a.user_id,
              'email', u.email,
              'full_name', COALESCE(prof.full_name, ''),
              'status', a.status,
              'created_at', a.created_at
            )
          )
          FROM public.admins a
          JOIN auth.users u ON u.id = a.user_id
          LEFT JOIN public.profiles prof ON prof.id = a.user_id
          WHERE a.scope_type = 'program'
          AND a.scope_id = p.id
          AND a.status = 'active'
        ),
        '[]'::json
      )
    ) AS assignments
  FROM unnest(p_program_ids) AS p(id);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.org_list_program_assignments_batch_v1(uuid[]) TO authenticated;

