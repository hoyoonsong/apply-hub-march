-- ============================================
-- ADD PROGRAM SPOTS TRACKING
-- Adds spots_mode and spots_count columns to programs table
-- ============================================

-- Add columns to programs table
ALTER TABLE public.programs
ADD COLUMN IF NOT EXISTS spots_mode text CHECK (spots_mode IN ('exact', 'unlimited', 'tbd')),
ADD COLUMN IF NOT EXISTS spots_count integer CHECK (spots_count IS NULL OR spots_count >= 0);

-- Add comment for documentation
COMMENT ON COLUMN public.programs.spots_mode IS 'Mode for spots: exact (fixed number), unlimited, or tbd (to be determined)';
COMMENT ON COLUMN public.programs.spots_count IS 'Number of spots available (only used when spots_mode is exact)';

-- Set default for existing programs: "exact" with 0 spots
-- This ensures existing programs have a valid spots mode
-- Organizations can update this to the correct number later
UPDATE public.programs
SET spots_mode = 'exact',
    spots_count = 0
WHERE spots_mode IS NULL;

-- ============================================
-- UPDATE PROGRAMS_PUBLIC VIEW (if it exists)
-- ============================================
-- If you have a programs_public view, you'll need to update it to include spots fields
-- Example (adjust based on your actual view definition):
-- 
-- CREATE OR REPLACE VIEW public.programs_public AS
-- SELECT 
--   ... (existing columns) ...,
--   spots_mode,
--   spots_count
-- FROM public.programs
-- WHERE ... (your existing view conditions) ...;
--
-- Note: The frontend code queries both programs_public and programs tables,
-- so make sure spots fields are available in both places.

-- ============================================
-- UPDATE PROGRAM CREATION/UPDATE FUNCTIONS
-- ============================================
-- NOTE: There are two overloads of org_create_program_draft_v1:
-- 1. Without p_metadata (6 params) - old version, may not be used
-- 2. With p_metadata (7 params) - current version used by frontend
-- 
-- We need to drop the old ones and create new ones with spots parameters.
-- Since we're changing the signature, we must DROP first, then CREATE.

-- Drop old overloads (both versions)
DROP FUNCTION IF EXISTS public.org_create_program_draft_v1(uuid, text, text, text, timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS public.org_create_program_draft_v1(uuid, text, text, text, timestamp with time zone, timestamp with time zone, jsonb);

-- Create org_create_program_draft_v1 WITH p_metadata and spots support
-- This is the version the frontend uses (with p_metadata)
CREATE FUNCTION public.org_create_program_draft_v1(
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
BEGIN
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

  RETURN v_program;
END;
$$;

-- Update org_update_program_draft_v1 with spots support
-- New parameters have DEFAULT NULL, so existing calls without them will still work
CREATE OR REPLACE FUNCTION public.org_update_program_draft_v1(
  p_program_id uuid,
  p_name text,
  p_type text,
  p_description text DEFAULT NULL,
  p_open_at timestamp with time zone DEFAULT NULL,
  p_close_at timestamp with time zone DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL,
  p_spots_mode text DEFAULT NULL,
  p_spots_count integer DEFAULT NULL
)
RETURNS public.programs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program public.programs;
  v_current_mode text;
  v_has_finalized_results boolean;
BEGIN
  -- Get current program
  SELECT * INTO v_program FROM public.programs WHERE id = p_program_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Program not found';
  END IF;

  -- Check if any results have been finalized (we can't change spots after that)
  SELECT EXISTS (
    SELECT 1 FROM public.application_reviews ar
    JOIN public.applications a ON a.id = ar.application_id
    WHERE a.program_id = p_program_id
    AND ar.status = 'submitted'
    AND ar.submitted_at IS NOT NULL
  ) INTO v_has_finalized_results;

  -- If spots_mode is being updated and results are finalized, only allow changes if current mode is not 'exact'
  -- Actually, let's allow updates until first publication (more flexible)
  -- But we'll validate the new values

  -- Use provided values or keep existing
  IF p_spots_mode IS NOT NULL THEN
    -- Validate spots_mode
    IF p_spots_mode NOT IN ('exact', 'unlimited', 'tbd') THEN
      RAISE EXCEPTION 'spots_mode must be one of: exact, unlimited, tbd';
    END IF;

    v_current_mode := p_spots_mode;

    -- Validate spots_count for exact mode
    IF p_spots_mode = 'exact' AND (p_spots_count IS NULL OR p_spots_count < 0) THEN
      -- If switching to exact, require spots_count
      IF v_program.spots_mode != 'exact' THEN
        RAISE EXCEPTION 'spots_count must be provided and >= 0 when spots_mode is exact';
      END IF;
      -- If already exact, use provided or keep existing
      IF p_spots_count IS NULL THEN
        p_spots_count := v_program.spots_count;
      END IF;
    END IF;

    -- Clear spots_count if not in exact mode
    IF p_spots_mode != 'exact' THEN
      p_spots_count := NULL;
    END IF;
  ELSE
    v_current_mode := v_program.spots_mode;
    IF p_spots_count IS NOT NULL AND v_current_mode = 'exact' THEN
      -- Updating count for existing exact mode
      IF p_spots_count < 0 THEN
        RAISE EXCEPTION 'spots_count must be >= 0';
      END IF;
    ELSIF p_spots_count IS NOT NULL AND v_current_mode != 'exact' THEN
      -- Can't set count if mode isn't exact
      p_spots_count := NULL;
    END IF;
  END IF;

  -- Update program
  UPDATE public.programs
  SET
    name = COALESCE(p_name, name),
    type = COALESCE(p_type, type),
    description = COALESCE(p_description, description),
    open_at = COALESCE(p_open_at, open_at),
    close_at = COALESCE(p_close_at, close_at),
    metadata = COALESCE(p_metadata, metadata),
    spots_mode = COALESCE(v_current_mode, spots_mode),
    spots_count = CASE
      WHEN v_current_mode = 'exact' THEN COALESCE(p_spots_count, spots_count)
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = p_program_id
  RETURNING * INTO v_program;

  RETURN v_program;
END;
$$;

-- ============================================
-- HELPER FUNCTION: Check if decision is an acceptance tag
-- ============================================
CREATE OR REPLACE FUNCTION public.is_acceptance_decision(
  p_decision text,
  p_program_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_review_form jsonb;
  v_decision_options jsonb;
  v_decision_lower text;
BEGIN
  -- Default acceptance tags (case-insensitive)
  IF p_decision IS NULL THEN
    RETURN false;
  END IF;

  v_decision_lower := lower(trim(p_decision));

  -- Check against common acceptance patterns
  IF v_decision_lower IN ('accept', 'accepted', 'approved', 'approve') THEN
    RETURN true;
  END IF;

  -- Try to get program's review form config to see if there's a custom acceptance tag
  -- For now, we'll use a simple heuristic: if it contains "accept" or "approve"
  -- In the future, this could be configurable via metadata
  SELECT metadata->'review_form' INTO v_review_form
  FROM public.programs
  WHERE id = p_program_id;

  -- For now, use simple pattern matching
  -- You could enhance this to check against a configured "acceptance_tags" array in metadata
  RETURN v_decision_lower LIKE '%accept%' OR v_decision_lower LIKE '%approve%';
END;
$$;

-- ============================================
-- UPDATE PUBLISH FUNCTIONS TO DECREMENT SPOTS
-- ============================================

-- Note: We need to modify publish_results_v1 and publish_all_finalized_for_program_v1
-- Since we don't have the full function definitions, we'll create a helper function
-- that can be called from within those functions, or we'll need to see the actual functions

-- Helper function to decrement spots when publishing acceptance results
CREATE OR REPLACE FUNCTION public.decrement_program_spots_if_needed(
  p_program_id uuid,
  p_decision text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_program public.programs;
  v_is_acceptance boolean;
BEGIN
  -- Get program
  SELECT * INTO v_program FROM public.programs WHERE id = p_program_id;
  IF NOT FOUND THEN
    RETURN; -- Program not found, skip
  END IF;

  -- Only decrement if mode is 'exact'
  IF v_program.spots_mode != 'exact' THEN
    RETURN;
  END IF;

  -- Check if this decision is an acceptance
  v_is_acceptance := public.is_acceptance_decision(p_decision, p_program_id);
  IF NOT v_is_acceptance THEN
    RETURN; -- Not an acceptance, don't decrement
  END IF;

  -- Decrement spots (but don't go below 0)
  UPDATE public.programs
  SET spots_count = GREATEST(0, COALESCE(spots_count, 0) - 1),
      updated_at = now()
  WHERE id = p_program_id
  AND spots_mode = 'exact'
  AND spots_count > 0;
END;
$$;

-- ============================================
-- UPDATE PUBLISH FUNCTIONS
-- ============================================
-- The publish_results_v1 and publish_all_finalized_for_program_v1 functions need to be updated
-- to call decrement_program_spots_if_needed. Since these functions may already exist in your database,
-- you'll need to modify them. Here's a template for what needs to be added:

-- In publish_results_v1, after creating each publication, add:
--   SELECT program_id INTO v_program_id FROM applications WHERE id = app_id;
--   SELECT decision INTO v_decision FROM application_reviews WHERE application_id = app_id;
--   PERFORM public.decrement_program_spots_if_needed(v_program_id, v_decision);

-- In publish_all_finalized_for_program_v1, in the loop that publishes results, add:
--   PERFORM public.decrement_program_spots_if_needed(p_program_id, review_decision);

-- Here's a complete example wrapper that you can use to update publish_results_v1:
-- (Adjust based on your actual function signature)

/*
CREATE OR REPLACE FUNCTION public.publish_results_v1(
  p_application_ids uuid[],
  p_visibility jsonb
)
RETURNS TABLE(...) -- adjust return type as needed
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_id uuid;
  v_program_id uuid;
  v_decision text;
  -- ... other variables
BEGIN
  -- ... existing logic to create publications ...
  
  -- After creating publications, decrement spots for acceptances
  FOREACH app_id IN ARRAY p_application_ids
  LOOP
    -- Get program_id and decision
    SELECT a.program_id, ar.decision
    INTO v_program_id, v_decision
    FROM applications a
    LEFT JOIN application_reviews ar ON ar.application_id = a.id
    WHERE a.id = app_id;
    
    -- Decrement spots if this is an acceptance
    IF v_program_id IS NOT NULL AND v_decision IS NOT NULL THEN
      PERFORM public.decrement_program_spots_if_needed(v_program_id, v_decision);
    END IF;
  END LOOP;
  
  -- ... return results ...
END;
$$;
*/

