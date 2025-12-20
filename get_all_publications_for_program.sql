-- ============================================
-- GET ALL PUBLICATIONS FOR PROGRAM
-- Returns all publications with claimable decision only (for spot claiming tracking)
-- ============================================
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
  spot_declined_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decision text;
BEGIN
  -- Get the decision from the review
  RETURN QUERY
  SELECT 
    ap.id AS publication_id,
    ap.application_id,
    COALESCE(prof.full_name, 'Unknown') AS applicant_name,
    ap.published_at,
    ap.claim_deadline,
    ap.spot_claimed_at,
    ap.spot_declined_at
  FROM public.application_publications ap
  JOIN public.applications a ON a.id = ap.application_id
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
  WHERE a.program_id = p_program_id
    AND ap.published_at IS NOT NULL
    AND LOWER(TRIM(COALESCE(ar.decision, (ar.ratings->>'decision')::text, ''))) = LOWER(TRIM(p_claimable_decision))
  ORDER BY ap.published_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_publications_for_program(uuid) TO authenticated;

-- Performance indexes (if not already exist)
CREATE INDEX IF NOT EXISTS idx_applications_program_id 
  ON public.applications(program_id);

CREATE INDEX IF NOT EXISTS idx_application_publications_published 
  ON public.application_publications(application_id, published_at) 
  WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_application_reviews_app_status_submitted 
  ON public.application_reviews(application_id, submitted_at DESC NULLS LAST, updated_at DESC) 
  WHERE status = 'submitted';

