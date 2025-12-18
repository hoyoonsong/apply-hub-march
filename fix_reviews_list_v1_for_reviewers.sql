-- ============================================
-- Fix reviews_list_v1 to show ALL assigned applications to reviewers
-- ============================================
-- This ensures reviewers see all applications they're assigned to,
-- not just ones they've already started reviewing
--
-- PRESERVED BEHAVIOR:
-- - Admins continue to see all submitted applications (unchanged)
-- - When p_mine_only=true, only shows applications with existing reviews (unchanged)
-- - When p_status is set, filters by review status (unchanged)
-- - All existing return columns and types remain the same (unchanged)
--
-- NEW BEHAVIOR:
-- - When p_mine_only=false, reviewers now see ALL assigned applications,
--   including ones they haven't started reviewing (status='not_started')

-- Step 1: Drop the existing function to allow return type changes
DROP FUNCTION IF EXISTS public.reviews_list_v1(boolean, text, uuid, uuid, integer, integer);

-- Step 2: Create the new function with the correct return type
CREATE FUNCTION public.reviews_list_v1(
  p_mine_only boolean DEFAULT false,
  p_status text DEFAULT NULL,
  p_program_id uuid DEFAULT NULL,
  p_org_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 1000,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  review_id text,
  application_id uuid,
  status text,
  score integer,
  updated_at timestamptz,
  submitted_at timestamptz,
  comments text,
  ratings jsonb,
  reviewer_id uuid,
  reviewer_name text,
  applicant_id uuid,
  applicant_name text,
  program_id uuid,
  program_name text,
  org_id uuid,
  org_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_is_reviewer boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user is an admin (org-level or program-level)
  SELECT EXISTS (
    SELECT 1
    FROM public.admins a
    WHERE a.user_id = v_user_id
      AND a.status = 'active'
      AND (
        (a.scope_type = 'org' AND (p_org_id IS NULL OR a.scope_id = p_org_id))
        OR (a.scope_type = 'program' AND (p_program_id IS NULL OR a.scope_id = p_program_id))
      )
  ) INTO v_is_admin;

  -- Check if user is a reviewer for the program
  IF p_program_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.reviewers r
      WHERE r.user_id = v_user_id
        AND r.scope_type = 'program'
        AND r.scope_id = p_program_id
        AND r.status = 'active'
    ) INTO v_is_reviewer;
  ELSE
    v_is_reviewer := EXISTS (
      SELECT 1
      FROM public.reviewers r
      WHERE r.user_id = v_user_id
        AND r.status = 'active'
    );
  END IF;

  -- If not admin and not reviewer, deny access
  IF NOT v_is_admin AND NOT v_is_reviewer THEN
    RAISE EXCEPTION 'Not authorized to view reviews';
  END IF;

  RETURN QUERY
  WITH assigned_applications AS (
    -- For reviewers: Get ALL submitted applications for programs they're assigned to
    -- If p_mine_only is true, only include applications where user has a review
    SELECT DISTINCT a.id AS app_id
    FROM public.applications a
    WHERE a.status = 'submitted'
      AND (
        -- If user is admin, see all applications
        v_is_admin
        OR
        -- If user is reviewer, see applications for programs they're assigned to
        (v_is_reviewer AND EXISTS (
          SELECT 1
          FROM public.reviewers r
          WHERE r.user_id = v_user_id
            AND r.scope_type = 'program'
            AND r.scope_id = a.program_id
            AND r.status = 'active'
        ))
      )
      AND (p_program_id IS NULL OR a.program_id = p_program_id)
      AND (p_org_id IS NULL OR EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = a.program_id AND p.organization_id = p_org_id
      ))
      -- If p_mine_only is true, only include applications where user has a review
      AND (
        p_mine_only = false
        OR EXISTS (
          SELECT 1 FROM public.application_reviews ar
          WHERE ar.application_id = a.id AND ar.reviewer_id = v_user_id
        )
      )
  ),
  existing_reviews AS (
    -- Get existing reviews for these applications
    -- If p_mine_only is true, only get current user's reviews
    -- If false, get the most recent review (prioritizing current user's if exists)
    SELECT DISTINCT ON (ar.application_id)
      ar.id::text AS review_id,
      ar.application_id,
      ar.status,
      ar.score,
      ar.updated_at,
      ar.submitted_at,
      ar.comments,
      ar.ratings,
      ar.reviewer_id,
      COALESCE(prof_reviewer.full_name, 'Unknown') AS reviewer_name
    FROM public.application_reviews ar
    JOIN assigned_applications aa ON aa.app_id = ar.application_id
    LEFT JOIN public.profiles prof_reviewer ON prof_reviewer.id = ar.reviewer_id
    WHERE (p_mine_only = false OR ar.reviewer_id = v_user_id)
      AND (p_status IS NULL OR ar.status = p_status)
    ORDER BY 
      ar.application_id,
      -- Prioritize current user's review if p_mine_only is false
      CASE WHEN p_mine_only = false AND ar.reviewer_id = v_user_id THEN 0 ELSE 1 END,
      ar.updated_at DESC
  )
  SELECT 
    COALESCE(er.review_id, 'not_started_' || aa.app_id::text) AS review_id,
    aa.app_id AS application_id,
    COALESCE(er.status, 'not_started') AS status,
    er.score,
    COALESCE(er.updated_at, a.updated_at) AS updated_at,
    -- Always use application's submitted_at (when the application was submitted)
    COALESCE(a.submitted_at, a.updated_at) AS submitted_at,
    er.comments,
    er.ratings,
    er.reviewer_id,
    COALESCE(er.reviewer_name, '') AS reviewer_name,
    a.user_id AS applicant_id,
    COALESCE(prof_applicant.full_name, '—') AS applicant_name,
    a.program_id,
    p.name AS program_name,
    p.organization_id AS org_id,
    o.name AS org_name
  FROM assigned_applications aa
  JOIN public.applications a ON a.id = aa.app_id
  JOIN public.programs p ON p.id = a.program_id
  JOIN public.organizations o ON o.id = p.organization_id
  LEFT JOIN public.profiles prof_applicant ON prof_applicant.id = a.user_id
  LEFT JOIN existing_reviews er ON er.application_id = aa.app_id
  ORDER BY COALESCE(er.updated_at, a.submitted_at, a.updated_at) DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.reviews_list_v1(boolean, text, uuid, uuid, integer, integer) TO authenticated;

