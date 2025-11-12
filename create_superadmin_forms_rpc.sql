-- Create RPC function to list superadmin forms (bypasses RLS)
-- This matches the pattern used by other superadmin pages

CREATE OR REPLACE FUNCTION public.super_list_forms_v1(
  p_form_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  form_type TEXT,
  form_data JSONB,
  status TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow superadmins
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Access denied. Superadmin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    sf.id,
    sf.form_type,
    sf.form_data,
    sf.status,
    sf.reviewed_by,
    sf.reviewed_at,
    sf.notes,
    sf.created_at,
    sf.updated_at,
    sf.user_id
  FROM public.superadmin_forms sf
  WHERE (p_form_type IS NULL OR sf.form_type = p_form_type)
    AND (p_status IS NULL OR sf.status = p_status)
  ORDER BY sf.created_at DESC;
END;
$$;

-- Function to submit a form (allows anyone to submit)
CREATE OR REPLACE FUNCTION public.super_submit_form_v1(
  p_form_type TEXT,
  p_form_data JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  form_type TEXT,
  form_data JSONB,
  status TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Insert the form submission
  INSERT INTO public.superadmin_forms (
    form_type,
    form_data,
    user_id,
    status
  ) VALUES (
    p_form_type,
    p_form_data,
    p_user_id,
    'pending'
  )
  RETURNING superadmin_forms.id INTO v_id;

  -- Return the inserted row
  RETURN QUERY
  SELECT 
    sf.id,
    sf.form_type,
    sf.form_data,
    sf.status,
    sf.reviewed_by,
    sf.reviewed_at,
    sf.notes,
    sf.created_at,
    sf.updated_at,
    sf.user_id
  FROM public.superadmin_forms sf
  WHERE sf.id = v_id;
END;
$$;

-- Function to update a form submission (superadmin only)
CREATE OR REPLACE FUNCTION public.super_update_form_v1(
  p_id UUID,
  p_status TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  form_type TEXT,
  form_data JSONB,
  status TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow superadmins
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Access denied. Superadmin role required.';
  END IF;

  -- Update the form submission
  UPDATE public.superadmin_forms AS sf
  SET 
    status = COALESCE(p_status, sf.status),
    notes = COALESCE(p_notes, sf.notes),
    reviewed_by = auth.uid(),
    reviewed_at = CASE 
      WHEN p_status IS NOT NULL OR p_notes IS NOT NULL THEN now()
      ELSE sf.reviewed_at
    END,
    updated_at = now()
  WHERE sf.id = p_id;

  -- Return the updated row
  RETURN QUERY
  SELECT 
    sf.id,
    sf.form_type,
    sf.form_data,
    sf.status,
    sf.reviewed_by,
    sf.reviewed_at,
    sf.notes,
    sf.created_at,
    sf.updated_at,
    sf.user_id
  FROM public.superadmin_forms sf
  WHERE sf.id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.super_list_forms_v1(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_submit_form_v1(TEXT, JSONB, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.super_update_form_v1(UUID, TEXT, TEXT) TO authenticated;

