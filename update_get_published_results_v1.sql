-- ============================================
-- UPDATE get_published_results_v1 TO INCLUDE CLAIM STATUS
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_published_results_v1();

-- Create updated function that includes spot_claimed_at and spot_declined_at
CREATE OR REPLACE FUNCTION public.get_published_results_v1()
RETURNS TABLE (
  application_id uuid,
  program_id uuid,
  program_name text,
  publication_id uuid,
  published_at timestamp with time zone,
  visibility jsonb,
  payload jsonb,
  spot_claimed_at timestamp with time zone,
  spot_declined_at timestamp with time zone,
  claim_deadline timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.application_id,
    a.program_id,
    p.name AS program_name,
    ap.id AS publication_id,
    ap.published_at,
    ap.visibility,
    ap.payload,
    ap.spot_claimed_at,
    ap.spot_declined_at,
    ap.claim_deadline
  FROM public.application_publications ap
  JOIN public.applications a ON a.id = ap.application_id
  JOIN public.programs p ON p.id = a.program_id
  WHERE a.user_id = auth.uid()
    AND ap.published_at IS NOT NULL
  ORDER BY ap.published_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_published_results_v1() TO authenticated;

