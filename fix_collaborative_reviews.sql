-- ============================================
-- FIX COLLABORATIVE REVIEWS
-- Allows any reviewer to edit/unfinalize any review for an application
-- ============================================

-- 1. Update app_upsert_review_v1 to allow editing any review (collaborative)
-- If a review exists for this application, update it (regardless of reviewer)
-- If no review exists, create one with current user as reviewer
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
    
    -- COLLABORATIVE: Find ANY review for this application (not just current user's)
    -- Get the most recent review to allow collaborative editing
    SELECT id INTO existing_review_id
    FROM public.application_reviews
    WHERE application_id = p_application_id
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 1;
    
    IF existing_review_id IS NOT NULL THEN
        -- Update existing review (collaborative - anyone can edit)
        -- Keep original reviewer_id to avoid constraint violations
        -- The updated_at timestamp and reviewer_name in UI will show who last edited
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
            -- Don't change reviewer_id - keep original to avoid unique constraint violation
            -- If current user wants to track their edit, they can create their own review
            -- Update submitted_at when status changes to 'submitted'
            submitted_at = CASE 
                WHEN p_status = 'submitted' THEN now()
                ELSE submitted_at  -- Keep existing submitted_at when unfinalizing
            END
        WHERE id = existing_review_id
        RETURNING * INTO v_review;
    ELSE
        -- Create new review if none exists
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

-- 2. Update review_get_v1 to return the most recent review (collaborative)
-- Drop existing function first to allow return type changes
DROP FUNCTION IF EXISTS public.review_get_v1(uuid);

CREATE OR REPLACE FUNCTION public.review_get_v1(
  p_application_id uuid
)
RETURNS TABLE (
  application_id uuid,
  program_id uuid,
  applicant_answers jsonb,
  application_schema jsonb,
  review jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_review jsonb;
BEGIN
  -- Get the most recent review for this application (collaborative - any reviewer)
  SELECT jsonb_build_object(
    'id', ar.id,
    'application_id', ar.application_id,
    'reviewer_id', ar.reviewer_id,
    'reviewer_name', COALESCE(prof.full_name, 'Unknown'),
    'score', ar.score,
    'comments', ar.comments,
    'ratings', ar.ratings,
    'status', ar.status,
    'submitted_at', ar.submitted_at,
    'updated_at', ar.updated_at,
    'created_at', ar.created_at,
    'decision', ar.decision
  ) INTO v_review
  FROM public.application_reviews ar
  LEFT JOIN public.profiles prof ON prof.id = ar.reviewer_id
  WHERE ar.application_id = p_application_id
  ORDER BY ar.updated_at DESC, ar.created_at DESC
  LIMIT 1;

  RETURN QUERY
  SELECT 
    a.id AS application_id,
    a.program_id,
    a.answers AS applicant_answers,
    COALESCE(p.metadata->'application_schema', '{}'::jsonb) AS application_schema,
    COALESCE(v_review, '{}'::jsonb) AS review
  FROM public.applications a
  JOIN public.programs p ON p.id = a.program_id
  WHERE a.id = p_application_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.review_get_v1(uuid) TO authenticated;

