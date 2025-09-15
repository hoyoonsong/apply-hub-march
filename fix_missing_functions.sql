-- Create the missing helper functions that the RPCs depend on

-- 1) Helper function to check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'superadmin'
  );
END;
$$;

-- 2) Helper function to check if user is admin for a specific scope
CREATE OR REPLACE FUNCTION public.is_admin_for(scope_type text, scope_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is superadmin first
  IF public.is_superadmin() THEN
    RETURN true;
  END IF;
  
  -- Check if user is admin for the specific scope
  RETURN EXISTS (
    SELECT 1 
    FROM public.admins a
    WHERE a.user_id = auth.uid() 
    AND a.scope_type = is_admin_for.scope_type
    AND a.scope_id = is_admin_for.scope_id
    AND a.status = 'active'
  );
END;
$$;

-- 3) Now create the RPCs that depend on these functions

-- Reader RPC: get the effective review form (with hard defaults if metadata absent)
CREATE OR REPLACE FUNCTION public.get_program_review_form(p_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg jsonb;
BEGIN
  SELECT (metadata -> 'review_form')
  INTO cfg
  FROM public.programs
  WHERE id = p_program_id;

  IF cfg IS NULL THEN
    cfg := jsonb_build_object(
      'show_score', true,
      'show_comments', true,
      'show_decision', false,
      'decision_options', jsonb_build_array('accept','waitlist','reject')
    );
  ELSE
    -- fill any missing keys with defaults, keep existing where present
    cfg := cfg
      || jsonb_build_object('show_score', coalesce((cfg->>'show_score')::boolean, true))
      || jsonb_build_object('show_comments', coalesce((cfg->>'show_comments')::boolean, true))
      || jsonb_build_object('show_decision', coalesce((cfg->>'show_decision')::boolean, false))
      || jsonb_build_object(
           'decision_options',
           CASE WHEN cfg ? 'decision_options'
                THEN cfg->'decision_options'
                ELSE to_jsonb(array['accept','waitlist','reject'])
           END
         );
  END IF;

  RETURN cfg;
END;
$$;

-- Writer RPC: set the review form (admins only)
CREATE OR REPLACE FUNCTION public.set_program_review_form(p_program_id uuid, p_form jsonb)
RETURNS public.programs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prog public.programs;
BEGIN
  -- Gate: only program/org admins or superadmin may edit
  IF NOT (public.is_superadmin() OR public.is_admin_for('program', p_program_id) OR public.is_admin_for('org', (SELECT organization_id FROM programs WHERE id = p_program_id))) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Optional: basic shape sanity
  IF p_form ? 'decision_options' THEN
    IF jsonb_typeof(p_form->'decision_options') <> 'array' THEN
      RAISE EXCEPTION 'decision_options must be an array of strings';
    END IF;
  END IF;

  UPDATE public.programs
  SET metadata = jsonb_set(
      coalesce(metadata, '{}'::jsonb),
      '{review_form}',
      p_form,
      true
    ),
    updated_at = now()
  WHERE id = p_program_id
  RETURNING * INTO _prog;

  RETURN _prog;
END;
$$;

-- 4) Add the decision column to application_reviews if it doesn't exist
ALTER TABLE public.application_reviews
ADD COLUMN IF NOT EXISTS decision text
CHECK (decision IN ('accept','waitlist','reject'));

-- 5) Seed default review_form into programs.metadata only where missing
UPDATE public.programs
SET metadata = jsonb_set(
  coalesce(metadata, '{}'::jsonb),
  '{review_form}',
  '{
    "show_score": true,
    "show_comments": true,
    "show_decision": false,
    "decision_options": ["accept","waitlist","reject"]
  }'::jsonb,
  true
)
WHERE (metadata IS NULL) OR (NOT (metadata ? 'review_form'));
