-- ============================================
-- AUTO-ASSIGN PROGRAM CREATOR AS REVIEWER
-- When a program is created, automatically assign the creator
-- (if they're an org admin) as a reviewer for that program
-- ============================================

CREATE OR REPLACE FUNCTION public.org_create_program_draft_v1(
  p_org_id uuid,
  p_name text,
  p_type text,
  p_description text DEFAULT NULL,
  p_open_at timestamp with time zone DEFAULT NULL,
  p_close_at timestamp with time zone DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_spots_mode text DEFAULT 'exact',
  p_spots_count integer DEFAULT NULL
)
RETURNS public.programs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program public.programs;
  v_creator_id uuid;
BEGIN
  -- Get the current user (program creator)
  v_creator_id := auth.uid();
  
  -- Validate spots_mode
  IF p_spots_mode NOT IN ('exact', 'unlimited', 'tbd') THEN
    RAISE EXCEPTION 'spots_mode must be one of: exact, unlimited, tbd';
  END IF;

  -- Validate spots_count for exact mode
  IF p_spots_mode = 'exact' AND (p_spots_count IS NULL OR p_spots_count < 0) THEN
    RAISE EXCEPTION 'spots_count must be provided and >= 0 when spots_mode is exact';
  END IF;

  -- Clear spots_count if not in exact mode
  IF p_spots_mode != 'exact' THEN
    p_spots_count := NULL;
  END IF;

  -- Insert program
  INSERT INTO public.programs (
    organization_id,
    name,
    type,
    description,
    open_at,
    close_at,
    metadata,
    spots_mode,
    spots_count
  ) VALUES (
    p_org_id,
    p_name,
    p_type,
    p_description,
    p_open_at,
    p_close_at,
    p_metadata,
    p_spots_mode,
    p_spots_count
  )
  RETURNING * INTO v_program;

  -- Auto-assign creator as reviewer if they're an org admin
  -- This ensures program creators can review applications for their own programs
  IF v_creator_id IS NOT NULL THEN
    -- Check if creator is an org admin for this organization
    IF EXISTS (
      SELECT 1 FROM public.admins
      WHERE scope_type = 'org'
        AND scope_id = p_org_id
        AND user_id = v_creator_id
        AND status = 'active'
    ) THEN
      -- Insert reviewer assignment (ignore if already exists)
      INSERT INTO public.reviewers (
        scope_type,
        scope_id,
        user_id,
        status
      ) VALUES (
        'program',
        v_program.id,
        v_creator_id,
        'active'
      )
      ON CONFLICT (scope_type, scope_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN v_program;
END;
$$;

