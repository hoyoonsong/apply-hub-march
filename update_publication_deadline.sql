-- ============================================
-- UPDATE PUBLICATION DEADLINE
-- Allows admins to update the claim deadline for a publication
-- ============================================
CREATE OR REPLACE FUNCTION public.update_publication_deadline(
  p_publication_id uuid,
  p_deadline timestamp with time zone
)
RETURNS public.application_publications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pub public.application_publications;
  _org_id uuid;
BEGIN
  -- Get publication (org_id is already stored on the publication)
  SELECT * INTO _pub
  FROM public.application_publications
  WHERE id = p_publication_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Publication not found';
  END IF;

  -- Use org_id directly from publication
  _org_id := _pub.org_id;

  -- Auth: superadmin or org admin
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
    RAISE EXCEPTION 'Not authorized to update publication deadline';
  END IF;

  -- Update deadline
  UPDATE public.application_publications
  SET claim_deadline = p_deadline
  WHERE id = p_publication_id
  RETURNING * INTO _pub;

  RETURN _pub;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_publication_deadline(uuid, timestamp with time zone) TO authenticated;

