-- ============================================
-- GET ALL PUBLICATIONS FOR PROGRAM
-- Returns all publications with claimable decision only (for spot claiming tracking)
-- ============================================

-- Drop existing function first (needed when changing return type)
DROP FUNCTION IF EXISTS public.get_all_publications_for_program(uuid, text);

CREATE OR REPLACE FUNCTION public.get_all_publications_for_program(
  p_program_id uuid,
  p_claimable_decision text
)
RETURNS TABLE (
  publication_id uuid,
  application_id uuid,
  applicant_name text,
  published_at timestamp with time zone,
  claim_deadline timestamp with time zone,
  spot_claimed_at timestamp with time zone,
  spot_declined_at timestamp with time zone,
  decision text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decision text;
BEGIN
  -- Get only the most recent publication per application that matches the claimable decision
  RETURN QUERY
  WITH latest_publications AS (
    -- Get the most recent publication for each application
    SELECT DISTINCT ON (ap.application_id)
      ap.id AS publication_id,
      ap.application_id,
      ap.published_at,
      ap.claim_deadline,
      ap.spot_claimed_at,
      ap.spot_declined_at,
      ap.payload
    FROM public.application_publications ap
    JOIN public.applications a ON a.id = ap.application_id
    WHERE a.program_id = p_program_id
      AND ap.published_at IS NOT NULL
    ORDER BY 
      ap.application_id,
      ap.published_at DESC
  )
  SELECT 
    lp.publication_id,
    lp.application_id,
    COALESCE(prof.full_name, 'Unknown') AS applicant_name,
    lp.published_at,
    lp.claim_deadline,
    lp.spot_claimed_at,
    lp.spot_declined_at,
    LOWER(TRIM(COALESCE(
      (lp.payload->>'decision')::text,
      ar.decision,
      (ar.ratings->>'decision')::text,
      ''
    ))) AS decision
  FROM latest_publications lp
  JOIN public.applications a ON a.id = lp.application_id
  LEFT JOIN public.profiles prof ON prof.id = a.user_id
  LEFT JOIN LATERAL (
    SELECT 
      ar_inner.decision AS decision, 
      ar_inner.ratings AS ratings
    FROM public.application_reviews ar_inner
    WHERE ar_inner.application_id = a.id
      AND ar_inner.status = 'submitted'
    ORDER BY ar_inner.submitted_at DESC NULLS LAST, ar_inner.updated_at DESC
    LIMIT 1
  ) ar ON true
  WHERE p_claimable_decision IS NOT NULL
    AND p_claimable_decision != ''
    AND LOWER(TRIM(COALESCE(
      (lp.payload->>'decision')::text,  -- Check publication payload first (what was actually published)
      ar.decision,                        -- Fall back to review decision column
      (ar.ratings->>'decision')::text,   -- Fall back to review ratings JSONB
      ''
    ))) = LOWER(TRIM(p_claimable_decision))
    AND COALESCE(
      (lp.payload->>'decision')::text,
      ar.decision,
      (ar.ratings->>'decision')::text,
      ''
    ) != ''  -- Ensure decision is not empty
  ORDER BY lp.published_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_publications_for_program(uuid, text) TO authenticated;

-- Performance indexes (if not already exist)
CREATE INDEX IF NOT EXISTS idx_applications_program_id 
  ON public.applications(program_id);

CREATE INDEX IF NOT EXISTS idx_application_publications_published 
  ON public.application_publications(application_id, published_at) 
  WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_application_reviews_app_status_submitted 
  ON public.application_reviews(application_id, submitted_at DESC NULLS LAST, updated_at DESC) 
  WHERE status = 'submitted';

