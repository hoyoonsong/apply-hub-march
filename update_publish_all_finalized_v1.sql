-- ============================================
-- UPDATE publish_all_finalized_for_program_v1 TO SUPPORT SPOTS DECREMENT
-- This function is a wrapper that calls publish_results_v1, so we just pass through the parameter
-- ============================================

CREATE OR REPLACE FUNCTION public.publish_all_finalized_for_program_v1(
  p_program_id uuid, 
  p_visibility jsonb DEFAULT jsonb_build_object('decision', true, 'score', false, 'comments', false, 'customMessage', NULL::unknown), 
  p_only_unpublished boolean DEFAULT true,
  p_acceptance_tag text DEFAULT NULL,
  p_claim_deadline timestamp with time zone DEFAULT NULL
)
RETURNS SETOF application_publications
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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

  -- Pass through the acceptance_tag and claim_deadline to publish_results_v1
  RETURN QUERY SELECT * FROM public.publish_results_v1(_app_ids, p_visibility, p_acceptance_tag, p_claim_deadline);
END;
$function$;

