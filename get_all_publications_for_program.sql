-- ============================================
-- GET ALL PUBLICATIONS FOR PROGRAM
-- Returns all publications with claimable decision only (for spot claiming tracking)
-- Includes safeguard fields to track claims/declines across all publications for same application
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
  decision text,
  any_publication_claimed_at timestamp with time zone,
  any_publication_declined_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate input parameters
  IF p_program_id IS NULL THEN
    RETURN;
  END IF;
  
  IF p_claimable_decision IS NULL OR TRIM(p_claimable_decision) = '' THEN
    RETURN;
  END IF;

  -- Only show publications where the MOST RECENT publication for that application matches the claimable decision
  -- This ensures that if a decision changes (e.g., from "contract" to "cut"), old publications disappear
  RETURN QUERY
  WITH most_recent_publications AS (
    -- Get the most recent publication for each application
    SELECT DISTINCT ON (ap.application_id)
      ap.id AS publication_id,
      ap.application_id,
      ap.published_at,
      (ap.payload->>'decision')::text AS decision
    FROM public.application_publications ap
    JOIN public.applications a ON a.id = ap.application_id
    WHERE a.program_id = p_program_id
      AND ap.published_at IS NOT NULL
      AND ap.payload IS NOT NULL
      AND ap.payload ? 'decision'
      AND (ap.payload->>'decision')::text IS NOT NULL
      AND (ap.payload->>'decision')::text != ''
    ORDER BY 
      ap.application_id,
      ap.published_at DESC
  ),
  matching_applications AS (
    -- Filter to only applications where the most recent publication matches the claimable decision
    SELECT mrp.application_id
    FROM most_recent_publications mrp
    WHERE mrp.decision IS NOT NULL
      AND LOWER(TRIM(mrp.decision)) = LOWER(TRIM(p_claimable_decision))
  )
  SELECT 
    ap.id AS publication_id,
    ap.application_id,
    COALESCE(prof.full_name, 'Unknown') AS applicant_name,
    ap.published_at,
    ap.claim_deadline,
    ap.spot_claimed_at,
    ap.spot_declined_at,
    -- Use publication payload decision only (what was actually published)
    LOWER(TRIM((ap.payload->>'decision')::text)) AS decision,
    -- Check if ANY publication for this application has been claimed
    -- This checks ALL publications for the application, regardless of their decision
    -- So if a publication's decision changes and it disappears/reappears, the claim status is preserved
    (SELECT MIN(ap2.spot_claimed_at) 
     FROM public.application_publications ap2 
     WHERE ap2.application_id = ap.application_id 
       AND ap2.spot_claimed_at IS NOT NULL) AS any_publication_claimed_at,
    -- Check if ANY publication for this application has been declined
    -- Same logic as above - tracks across all publications for the application
    (SELECT MIN(ap3.spot_declined_at) 
     FROM public.application_publications ap3 
     WHERE ap3.application_id = ap.application_id 
       AND ap3.spot_declined_at IS NOT NULL) AS any_publication_declined_at
  FROM public.application_publications ap
  JOIN public.applications a ON a.id = ap.application_id
  INNER JOIN matching_applications ma ON ma.application_id = ap.application_id
  LEFT JOIN public.profiles prof ON prof.id = a.user_id
  WHERE a.program_id = p_program_id
    AND ap.published_at IS NOT NULL
    AND ap.payload IS NOT NULL
    AND ap.payload ? 'decision'
    -- Only include publications that match the claimable decision
    AND (ap.payload->>'decision')::text IS NOT NULL
    AND TRIM((ap.payload->>'decision')::text) != ''
    AND LOWER(TRIM((ap.payload->>'decision')::text)) = LOWER(TRIM(p_claimable_decision))
  ORDER BY ap.published_at DESC NULLS LAST;
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

