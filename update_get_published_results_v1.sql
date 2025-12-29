-- ============================================
-- UPDATE get_published_results_v1 TO INCLUDE CLAIM STATUS AND ORGANIZATION INFO
-- Includes information about whether ANY publication for the same application has been claimed/declined
-- Also includes organization name and logo_url for display
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_published_results_v1();

-- Create updated function that includes spot_claimed_at and spot_declined_at
-- Also includes any_publication_claimed_at and any_publication_declined_at to track claims/declines
-- across all publications for the same application (even if not the current one)
-- Also includes organization_name and organization_logo_url for display
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
  claim_deadline timestamp with time zone,
  any_publication_claimed_at timestamp with time zone,
  any_publication_declined_at timestamp with time zone,
  organization_name text,
  organization_logo_url text
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
    ap.claim_deadline,
    -- Check if ANY publication for this application has been claimed
    (SELECT MIN(ap2.spot_claimed_at) 
     FROM public.application_publications ap2 
     WHERE ap2.application_id = ap.application_id 
       AND ap2.spot_claimed_at IS NOT NULL) AS any_publication_claimed_at,
    -- Check if ANY publication for this application has been declined
    (SELECT MIN(ap3.spot_declined_at) 
     FROM public.application_publications ap3 
     WHERE ap3.application_id = ap.application_id 
       AND ap3.spot_declined_at IS NOT NULL) AS any_publication_declined_at,
    -- Organization information
    o.name AS organization_name,
    o.logo_url AS organization_logo_url
  FROM public.application_publications ap
  JOIN public.applications a ON a.id = ap.application_id
  JOIN public.programs p ON p.id = a.program_id
  JOIN public.organizations o ON o.id = p.organization_id
  WHERE a.user_id = auth.uid()
    AND ap.published_at IS NOT NULL
  ORDER BY ap.published_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_published_results_v1() TO authenticated;

