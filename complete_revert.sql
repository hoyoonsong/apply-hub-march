-- ============================================
-- COMPLETE REVERT: Restore everything to original state
-- This will fix both the save error and the publish queue
-- ============================================

-- 1. Restore app_upsert_review_v1 to original (fixes the "Save error")
-- Drop ALL possible versions to ensure clean state
DROP FUNCTION IF EXISTS public.app_upsert_review_v1(uuid, integer, text, jsonb, text);
DROP FUNCTION IF EXISTS public.app_upsert_review_v1(uuid, integer, text, jsonb, text, text);
DROP FUNCTION IF EXISTS public.app_upsert_review_v1(uuid, jsonb, text, integer, text);
DROP FUNCTION IF EXISTS public.app_upsert_review_v1(uuid, jsonb, text, integer, text, text);
-- Drop by name pattern to catch any other variations
DO $$ 
DECLARE
  drop_sql text;
BEGIN
  SELECT string_agg('DROP FUNCTION IF EXISTS ' || oid::regprocedure, '; ')
  INTO drop_sql
  FROM pg_proc
  WHERE proname = 'app_upsert_review_v1';
  
  IF drop_sql IS NOT NULL THEN
    EXECUTE drop_sql;
  END IF;
END $$;

-- Create the function with the ORIGINAL parameter order (matching restore_working_state.sql)
-- but add p_decision as optional parameter since frontend calls it
-- Also update submitted_at when status changes to 'submitted' so we can track refinalization
CREATE OR REPLACE FUNCTION public.app_upsert_review_v1(
    p_application_id uuid,
    p_score integer,
    p_comments text,
    p_ratings jsonb,
    p_status text,
    p_decision text DEFAULT NULL
)
RETURNS public.application_reviews
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_review public.application_reviews;
    v_reviewer_id uuid;
    existing_review_id uuid;
    v_ratings jsonb;
BEGIN
    v_reviewer_id := auth.uid();
    IF v_reviewer_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    IF p_status IS NULL THEN
        p_status := 'draft';
    END IF;
    
    -- Merge decision into ratings if provided
    v_ratings := p_ratings;
    IF p_decision IS NOT NULL THEN
        v_ratings := v_ratings || jsonb_build_object('decision', p_decision);
    END IF;
    
    SELECT id INTO existing_review_id
    FROM public.application_reviews
    WHERE application_id = p_application_id 
    AND reviewer_id = v_reviewer_id;
    
    IF existing_review_id IS NOT NULL THEN
        UPDATE public.application_reviews SET
            ratings = v_ratings,
            comments = p_comments,
            score = p_score,
            status = p_status,
            decision = CASE 
                WHEN p_decision IS NOT NULL THEN p_decision
                ELSE decision  -- Keep existing decision if p_decision is NULL
            END,
            updated_at = now(),
            -- Update submitted_at when status changes to 'submitted' (including refinalization)
            -- This allows us to detect if review was finalized after publication
            submitted_at = CASE 
                WHEN p_status = 'submitted' THEN now()
                ELSE submitted_at  -- Keep existing submitted_at when unfinalizing
            END
        WHERE id = existing_review_id
        RETURNING * INTO v_review;
    ELSE
        INSERT INTO public.application_reviews (
            application_id, reviewer_id, ratings, comments, score, status, updated_at, decision, submitted_at
        )
        VALUES (
            p_application_id, v_reviewer_id, v_ratings, p_comments, p_score, p_status, now(), 
            COALESCE(p_decision, NULL),
            CASE WHEN p_status = 'submitted' THEN now() ELSE NULL END
        )
        RETURNING * INTO v_review;
    END IF;

    RETURN v_review;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.app_upsert_review_v1(uuid, integer, text, jsonb, text, text) TO authenticated;

-- 2. Create get_publish_queue function that marks publications as stale when review is refinalized
-- If a review was finalized AFTER the publication was published, it needs republishing
CREATE OR REPLACE FUNCTION public.get_publish_queue(
  program_id uuid
)
RETURNS TABLE (
  application_id uuid,
  program_name text,
  applicant_name text,
  decision text,
  score integer,
  comments text,
  already_published boolean,
  review_finalized_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program_id uuid;
BEGIN
  v_program_id := program_id;
  
  RETURN QUERY
  SELECT 
    a.id AS application_id,
    p.name AS program_name,
    COALESCE(prof.full_name, 'Unknown') AS applicant_name,
    COALESCE(ar.decision, (ar.ratings->>'decision')::text) AS decision,
    ar.score,
    ar.comments,
    -- already_published is true only if:
    -- 1. There's a publication AND
    -- 2. The review was finalized BEFORE or AT the same time as the publication was published
    -- If the review was finalized AFTER the publication, it's stale and needs republishing
    -- Fallback to updated_at if submitted_at is NULL (for older reviews)
    CASE 
      WHEN ap.id IS NOT NULL THEN
        CASE 
          WHEN ar.submitted_at IS NOT NULL AND ar.submitted_at <= ap.published_at THEN true
          WHEN ar.submitted_at IS NULL AND ar.updated_at <= ap.published_at THEN true
          ELSE false
        END
      ELSE false
    END AS already_published,
    ar.submitted_at AS review_finalized_at
  FROM public.applications a
  JOIN public.programs p ON p.id = a.program_id
  JOIN public.application_reviews ar ON ar.application_id = a.id
  LEFT JOIN public.profiles prof ON prof.id = a.user_id
  LEFT JOIN public.application_publications ap ON ap.id = a.results_current_publication_id
  WHERE a.program_id = v_program_id
    AND ar.status = 'submitted'
  ORDER BY COALESCE(ar.submitted_at, ar.updated_at) DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_publish_queue(uuid) TO authenticated;

-- 3. Update publish_all_finalized_for_program_v1 to use the same logic as get_publish_queue
-- This ensures refinalized reviews are correctly identified as needing republishing
DROP FUNCTION IF EXISTS public.publish_all_finalized_for_program_v1(uuid, jsonb, boolean, text);
CREATE OR REPLACE FUNCTION public.publish_all_finalized_for_program_v1(
  p_program_id uuid, 
  p_visibility jsonb DEFAULT jsonb_build_object('decision', true, 'score', false, 'comments', false, 'customMessage', NULL::unknown), 
  p_only_unpublished boolean DEFAULT true,
  p_acceptance_tag text DEFAULT NULL
)
RETURNS SETOF application_publications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _app_ids uuid[];
BEGIN
  SELECT organization_id INTO _org_id FROM public.programs WHERE id = p_program_id;
  IF _org_id IS NULL THEN RAISE EXCEPTION 'Program not found'; END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.admins ad
      WHERE ad.user_id = auth.uid()
        AND ad.scope_type = 'org'
        AND ad.scope_id = _org_id
        AND ad.status = 'active'
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Use the same logic as get_publish_queue to determine which reviews need publishing
  SELECT ARRAY_AGG(a.id) INTO _app_ids
  FROM public.applications a
  JOIN public.application_reviews ar ON ar.application_id = a.id
  LEFT JOIN public.application_publications ap ON ap.id = a.results_current_publication_id
  WHERE a.program_id = p_program_id
    AND ar.status = 'submitted'
    AND (
      -- If p_only_unpublished is true, only include reviews that need republishing
      NOT p_only_unpublished
      OR (
        -- Review needs republishing if:
        -- 1. No publication exists, OR
        -- 2. Review was finalized AFTER the publication was published
        ap.id IS NULL
        OR (
          -- Check if submitted_at is newer than published_at
          (ar.submitted_at IS NOT NULL AND ar.submitted_at > ap.published_at)
          OR
          -- Fallback to updated_at if submitted_at is NULL
          (ar.submitted_at IS NULL AND ar.updated_at > ap.published_at)
        )
      )
    );

  IF _app_ids IS NULL OR array_length(_app_ids,1) IS NULL THEN
    RETURN;
  END IF;

  -- Pass through the acceptance_tag to publish_results_v1
  RETURN QUERY SELECT * FROM public.publish_results_v1(_app_ids, p_visibility, p_acceptance_tag);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.publish_all_finalized_for_program_v1(uuid, jsonb, boolean, text) TO authenticated;

