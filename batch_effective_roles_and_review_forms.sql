-- ============================================
-- BATCHED FUNCTIONS FOR OPTIMIZATION
-- These functions accept arrays of IDs and return results for all in one query
-- This eliminates N+1 query problems
-- ============================================

-- ============================================
-- 1. BATCHED EFFECTIVE ROLES FUNCTION
-- ============================================
-- Returns effective roles for multiple users in one query
-- Replaces N calls to super_user_effective_roles_v1 with 1 call

CREATE OR REPLACE FUNCTION public.super_user_effective_roles_batch_v1(
  p_user_ids uuid[]
)
RETURNS TABLE (
  user_id uuid,
  superadmin_from_profile boolean,
  has_admin boolean,
  has_reviewer boolean,
  has_co_manager boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow superadmins
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Access denied. Superadmin role required.';
  END IF;

  -- Return effective roles for all requested users in one query
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    (p.role = 'superadmin') AS superadmin_from_profile,
    EXISTS (
      SELECT 1 
      FROM public.admins a 
      WHERE a.user_id = p.id 
      AND a.status = 'active'
    ) AS has_admin,
    EXISTS (
      SELECT 1 
      FROM public.reviewers r 
      WHERE r.user_id = p.id 
      AND r.status = 'active'
    ) AS has_reviewer,
    EXISTS (
      SELECT 1 
      FROM public.coalition_managers cm 
      WHERE cm.user_id = p.id 
      AND cm.status = 'active'
    ) AS has_co_manager
  FROM public.profiles p
  WHERE p.id = ANY(p_user_ids);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.super_user_effective_roles_batch_v1(uuid[]) TO authenticated;

-- ============================================
-- 2. BATCHED PROGRAM REVIEW FORMS FUNCTION
-- ============================================
-- Returns review form configs for multiple programs in one query
-- Replaces N calls to get_program_review_form with 1 call

CREATE OR REPLACE FUNCTION public.get_program_review_forms_batch_v1(
  p_program_ids uuid[]
)
RETURNS TABLE (
  program_id uuid,
  review_form jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return review form configs for all requested programs in one query
  -- Matches the logic from get_program_review_form (with defaults merging)
  RETURN QUERY
  SELECT 
    p.id AS program_id,
    CASE 
      WHEN (p.metadata -> 'review_form') IS NULL THEN
        -- No review_form in metadata, use defaults
        jsonb_build_object(
          'show_score', true,
          'show_comments', true,
          'show_decision', false,
          'decision_options', jsonb_build_array('accept','waitlist','reject')
        )
      ELSE
        -- Merge existing review_form with defaults (fill missing keys)
        (p.metadata -> 'review_form')
          || jsonb_build_object('show_score', COALESCE(((p.metadata -> 'review_form')->>'show_score')::boolean, true))
          || jsonb_build_object('show_comments', COALESCE(((p.metadata -> 'review_form')->>'show_comments')::boolean, true))
          || jsonb_build_object('show_decision', COALESCE(((p.metadata -> 'review_form')->>'show_decision')::boolean, false))
          || jsonb_build_object(
               'decision_options',
               CASE 
                 WHEN (p.metadata -> 'review_form') ? 'decision_options'
                 THEN (p.metadata -> 'review_form')->'decision_options'
                 ELSE to_jsonb(array['accept','waitlist','reject'])
               END
             )
    END AS review_form
  FROM public.programs p
  WHERE p.id = ANY(p_program_ids);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_program_review_forms_batch_v1(uuid[]) TO authenticated;

-- ============================================
-- PERFORMANCE NOTES
-- ============================================
-- These functions use array operations (ANY) which are efficient in PostgreSQL
-- They should perform better than N individual queries because:
-- 1. Single round-trip to database
-- 2. PostgreSQL can optimize the query plan for batch operations
-- 3. Reduced network overhead
-- 
-- Expected performance improvement:
-- - 100 users: 100 queries → 1 query (99% reduction)
-- - 20 programs: 20 queries → 1 query (95% reduction)

