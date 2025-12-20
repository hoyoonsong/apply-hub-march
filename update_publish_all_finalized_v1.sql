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

  SELECT ARRAY_AGG(x.application_id) INTO _app_ids
  FROM (
    SELECT q.application_id
    FROM public.admin_finalized_queue q
    WHERE q.program_id = p_program_id
      AND (NOT p_only_unpublished OR q.already_published = false)
  ) x;

  IF _app_ids IS NULL OR array_length(_app_ids,1) IS NULL THEN
    RETURN;
  END IF;

  -- Pass through the acceptance_tag and claim_deadline to publish_results_v1
  RETURN QUERY SELECT * FROM public.publish_results_v1(_app_ids, p_visibility, p_acceptance_tag, p_claim_deadline);
END;
$function$;

