-- ============================================
-- FIX get_publish_queue FOR MULTIPLE REVIEWERS
-- Ensures it picks the most recent submitted review
-- ============================================

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
  WITH latest_reviews AS (
    -- Get the most recent submitted review for each application
    SELECT DISTINCT ON (ar.application_id)
      ar.application_id,
      ar.decision,
      ar.ratings,
      ar.score,
      ar.comments,
      ar.submitted_at,
      ar.updated_at
    FROM public.application_reviews ar
    JOIN public.applications a ON a.id = ar.application_id
    WHERE a.program_id = v_program_id
      AND ar.status = 'submitted'
    ORDER BY 
      ar.application_id,
      ar.submitted_at DESC NULLS LAST,
      ar.updated_at DESC
  )
  SELECT 
    a.id AS application_id,
    p.name AS program_name,
    COALESCE(prof.full_name, 'Unknown') AS applicant_name,
    COALESCE(lr.decision, (lr.ratings->>'decision')::text) AS decision,
    lr.score,
    lr.comments,
    -- already_published is true only if:
    -- 1. There's a publication AND
    -- 2. The review was finalized BEFORE or AT the same time as the publication was published
    -- If the review was finalized AFTER the publication, it's stale and needs republishing
    CASE 
      WHEN ap.id IS NOT NULL THEN
        CASE 
          WHEN lr.submitted_at IS NOT NULL AND lr.submitted_at <= ap.published_at THEN true
          WHEN lr.submitted_at IS NULL AND lr.updated_at <= ap.published_at THEN true
          ELSE false
        END
      ELSE false
    END AS already_published,
    lr.submitted_at AS review_finalized_at
  FROM public.applications a
  JOIN public.programs p ON p.id = a.program_id
  JOIN latest_reviews lr ON lr.application_id = a.id
  LEFT JOIN public.profiles prof ON prof.id = a.user_id
  LEFT JOIN public.application_publications ap ON ap.id = a.results_current_publication_id
  WHERE a.program_id = v_program_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_publish_queue(uuid) TO authenticated;

