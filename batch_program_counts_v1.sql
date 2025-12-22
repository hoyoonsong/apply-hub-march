-- ============================================
-- BATCH PROGRAM COUNTS FUNCTION
-- Optimizes PublishResultsHomePage by batching count queries
-- Returns finalized_count and published_count for multiple programs in one call
-- ============================================

CREATE OR REPLACE FUNCTION public.get_program_counts_batch_v1(
  p_program_ids uuid[]
)
RETURNS TABLE (
  program_id uuid,
  finalized_count bigint,
  published_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return counts for all programs in one query
  RETURN QUERY
  SELECT 
    p.id AS program_id,
    -- Count of finalized reviews (status = 'submitted')
    COALESCE(
      COUNT(DISTINCT CASE 
        WHEN ar.status = 'submitted' THEN a.id 
      END), 
      0
    ) AS finalized_count,
    -- Count of published results (has current_publication_id)
    COALESCE(
      COUNT(DISTINCT CASE 
        WHEN a.results_current_publication_id IS NOT NULL THEN a.id 
      END), 
      0
    ) AS published_count
  FROM unnest(p_program_ids) AS p(id)
  LEFT JOIN applications a ON a.program_id = p.id
  LEFT JOIN application_reviews ar ON ar.application_id = a.id
  GROUP BY p.id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_program_counts_batch_v1(uuid[]) TO authenticated;

