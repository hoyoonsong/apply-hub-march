-- ============================================
-- FIX PUBLISH FUNCTION FOR MULTIPLE REVIEWERS
-- Ensures publish_results_v1 handles multiple reviews correctly
-- ============================================

-- Update publish_results_v1 to get the most recent submitted review
-- This is needed because after fixing the constraint, multiple reviewers
-- can review the same application
CREATE OR REPLACE FUNCTION public.publish_results_v1(
  p_application_ids uuid[], 
  p_visibility jsonb DEFAULT jsonb_build_object('decision', true, 'score', false, 'comments', false, 'customMessage', NULL::unknown),
  p_acceptance_tag text DEFAULT NULL,
  p_claim_deadline timestamp with time zone DEFAULT NULL
)
RETURNS SETOF application_publications
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  _app_id uuid;
  _org_id uuid;
  _pub_id uuid;
  _decision text;
  _score int;
  _comments text;
  _payload jsonb;
  _app_user uuid;
  _program_id uuid;
  _program public.programs;
  _claiming_config jsonb;
  _claiming_enabled boolean;
BEGIN
  FOREACH _app_id IN ARRAY p_application_ids LOOP
    -- resolve org + applicant + program
    SELECT prg.organization_id, a.user_id, prg.id
      INTO _org_id, _app_user, _program_id
    FROM public.applications a
    JOIN public.programs prg ON prg.id = a.program_id
    WHERE a.id = _app_id;

    IF _org_id IS NULL THEN
      RAISE EXCEPTION 'Application % not found', _app_id;
    END IF;

    -- auth: superadmin or org admin
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
      RAISE EXCEPTION 'Not authorized to publish for application %', _app_id;
    END IF;

    -- gather review snapshot - CHECK BOTH decision column AND ratings JSONB
    -- Get the most recent submitted review (if multiple reviewers exist)
    SELECT 
      COALESCE(r.decision, (r.ratings->>'decision')::text),
      r.score, 
      r.comments
      INTO _decision, _score, _comments
    FROM public.application_reviews r
    WHERE r.application_id = _app_id
      AND r.status = 'submitted'
    ORDER BY r.submitted_at DESC NULLS LAST, r.updated_at DESC
    LIMIT 1;

    _payload := jsonb_build_object(
      'decision', _decision,
      'score', _score,
      'comments', _comments
    );

    INSERT INTO public.application_publications(application_id, org_id, published_by, payload, visibility, version, claim_deadline)
    VALUES (_app_id, _org_id, auth.uid(), _payload, p_visibility, 1, p_claim_deadline)
    RETURNING id INTO _pub_id;

    UPDATE public.applications
      SET results_current_publication_id = _pub_id
    WHERE id = _app_id;

    INSERT INTO public.application_publication_events(publication_id, event_type, actor_id, note)
    VALUES (_pub_id, 'publish', auth.uid(), 'batch publish');

    INSERT INTO public.notifications(user_id, type, title, message, data)
    VALUES (
      _app_user,
      'results_published',
      'Your results are available',
      'A decision has been published for your application.',
      jsonb_build_object('application_id', _app_id, 'publication_id', _pub_id)
    );

    -- Check if claiming is enabled for this program
    SELECT * INTO _program FROM public.programs WHERE id = _program_id;
    _claiming_config := _program.metadata->'spotClaiming';
    _claiming_enabled := COALESCE((_claiming_config->>'enabled')::boolean, false);

    -- Only decrement spots if:
    -- 1. Acceptance tag is provided (old behavior)
    -- 2. Claiming is NOT enabled (if claiming is enabled, spots will be decremented when applicants claim)
    IF p_acceptance_tag IS NOT NULL 
       AND _program_id IS NOT NULL 
       AND _decision IS NOT NULL 
       AND NOT _claiming_enabled THEN
      PERFORM public.decrement_program_spots_if_needed(_program_id, _decision, p_acceptance_tag);
    END IF;

    RETURN QUERY SELECT * FROM public.application_publications WHERE id = _pub_id;
  END LOOP;
END;
$function$;

