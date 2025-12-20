-- ============================================
-- ADD SPOT CLAIMING FEATURE
-- Adds columns to track spot claims/declines
-- ============================================

-- Add columns to application_publications table
ALTER TABLE public.application_publications
ADD COLUMN IF NOT EXISTS spot_claimed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS spot_declined_at timestamp with time zone;

-- Add comments for documentation
COMMENT ON COLUMN public.application_publications.spot_claimed_at IS 'Timestamp when applicant claimed their spot';
COMMENT ON COLUMN public.application_publications.spot_declined_at IS 'Timestamp when applicant declined their spot';

-- ============================================
-- RPC FUNCTION: Claim or Decline Spot
-- ============================================
CREATE OR REPLACE FUNCTION public.claim_or_decline_spot(
  p_publication_id uuid,
  p_action text -- 'claim' or 'decline'
)
RETURNS public.application_publications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pub public.application_publications;
  _app_id uuid;
  _program_id uuid;
  _decision text;
  _program public.programs;
  _claiming_config jsonb;
  _claimable_decision text;
  _claim_deadline timestamp with time zone;
  _allow_decline boolean;
  _spots_count integer;
  _spots_mode text;
BEGIN
  -- Get publication
  SELECT * INTO _pub FROM public.application_publications WHERE id = p_publication_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Publication not found';
  END IF;

  -- Check if already claimed or declined
  IF _pub.spot_claimed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Spot has already been claimed';
  END IF;
  IF _pub.spot_declined_at IS NOT NULL THEN
    RAISE EXCEPTION 'Offer has already been declined';
  END IF;

  -- Get application and program info
  SELECT a.id, a.program_id, COALESCE(ar.decision, (ar.ratings->>'decision')::text)
    INTO _app_id, _program_id, _decision
  FROM public.applications a
  LEFT JOIN public.application_reviews ar ON ar.application_id = a.id
  WHERE a.id = _pub.application_id;

  IF _program_id IS NULL THEN
    RAISE EXCEPTION 'Program not found';
  END IF;

  -- Get program and claiming config
  SELECT * INTO _program FROM public.programs WHERE id = _program_id;
  _claiming_config := _program.metadata->'spotClaiming';
  
  -- Check if claiming is enabled
  IF NOT (_claiming_config->>'enabled')::boolean THEN
    RAISE EXCEPTION 'Spot claiming is not enabled for this program';
  END IF;

  -- Extract claiming settings
  _claimable_decision := _claiming_config->>'claimableDecision';
  _claim_deadline := CASE 
    WHEN _claiming_config->>'claimDeadline' IS NOT NULL 
    THEN (_claiming_config->>'claimDeadline')::timestamp with time zone
    ELSE NULL
  END;
  _allow_decline := COALESCE((_claiming_config->>'allowDecline')::boolean, true);
  _spots_mode := _program.spots_mode;
  _spots_count := _program.spots_count;

  -- Validate decision matches claimable decision
  IF LOWER(TRIM(COALESCE(_decision, ''))) != LOWER(TRIM(_claimable_decision)) THEN
    RAISE EXCEPTION 'Your decision does not match the claimable decision';
  END IF;

  -- Validate deadline (if set)
  IF _claim_deadline IS NOT NULL AND now() > _claim_deadline THEN
    RAISE EXCEPTION 'The deadline to claim your spot has passed';
  END IF;

  -- Handle decline action
  IF p_action = 'decline' THEN
    IF NOT _allow_decline THEN
      RAISE EXCEPTION 'Decline responses are not allowed for this program';
    END IF;
    
    UPDATE public.application_publications
    SET spot_declined_at = now()
    WHERE id = p_publication_id
    RETURNING * INTO _pub;
    
    RETURN _pub;
  END IF;

  -- Handle claim action
  IF p_action = 'claim' THEN
    -- Check if spots are available (only for exact mode)
    IF _spots_mode = 'exact' THEN
      IF _spots_count IS NULL OR _spots_count <= 0 THEN
        RAISE EXCEPTION 'No spots available';
      END IF;
    END IF;

    -- Update publication
    UPDATE public.application_publications
    SET spot_claimed_at = now()
    WHERE id = p_publication_id
    RETURNING * INTO _pub;

    -- Decrement spots if in exact mode
    IF _spots_mode = 'exact' THEN
      PERFORM public.decrement_program_spots_if_needed(_program_id, _decision, _claimable_decision);
    END IF;

    RETURN _pub;
  END IF;

  RAISE EXCEPTION 'Invalid action. Must be "claim" or "decline"';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.claim_or_decline_spot(uuid, text) TO authenticated;

-- ============================================
-- RPC FUNCTION: Get Spot Claiming Status for Program
-- Returns list of claimed and declined spots
-- ============================================
CREATE OR REPLACE FUNCTION public.get_spot_claiming_status(
  p_program_id uuid
)
RETURNS TABLE (
  publication_id uuid,
  application_id uuid,
  applicant_name text,
  decision text,
  claimed_at timestamp with time zone,
  declined_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.id AS publication_id,
    ap.application_id,
    COALESCE(prof.full_name, 'Unknown') AS applicant_name,
    COALESCE(ar.decision, (ar.ratings->>'decision')::text) AS decision,
    ap.spot_claimed_at AS claimed_at,
    ap.spot_declined_at AS declined_at
  FROM public.application_publications ap
  JOIN public.applications a ON a.id = ap.application_id
  LEFT JOIN public.profiles prof ON prof.id = a.user_id
  LEFT JOIN public.application_reviews ar ON ar.application_id = a.id
  WHERE a.program_id = p_program_id
    AND (ap.spot_claimed_at IS NOT NULL OR ap.spot_declined_at IS NOT NULL)
  ORDER BY 
    COALESCE(ap.spot_claimed_at, ap.spot_declined_at) DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_spot_claiming_status(uuid) TO authenticated;

