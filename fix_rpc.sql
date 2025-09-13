-- Drop the existing function first
DROP FUNCTION IF EXISTS org_submit_program_for_review_v1(uuid, text);

-- Create the updated RPC function to handle pending_changes status properly
CREATE OR REPLACE FUNCTION org_submit_program_for_review_v1(
  p_program_id uuid,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_program programs%ROWTYPE;
  v_metadata jsonb;
  v_current_status text;
BEGIN
  -- Get the program
  SELECT * INTO v_program FROM programs WHERE id = p_program_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Program not found';
  END IF;

  -- Get current metadata
  v_metadata := COALESCE(v_program.metadata, '{}'::jsonb);
  v_current_status := v_metadata->>'review_status';

  -- Update the review status based on current state
  IF v_current_status = 'pending_changes' THEN
    -- If already has pending changes, keep as pending_changes and just update the note
    UPDATE programs
    SET
      metadata = jsonb_set(
        v_metadata,
        '{review_note}',
        to_jsonb(COALESCE(p_note, ''))
      ),
      updated_at = now()
    WHERE id = p_program_id;
  ELSE
    -- For new submissions, resubmissions, or other statuses, set to submitted
    UPDATE programs
    SET
      metadata = jsonb_set(
        jsonb_set(
          v_metadata,
          '{review_status}',
          '"submitted"'
        ),
        '{review_note}',
        to_jsonb(COALESCE(p_note, ''))
      ),
      updated_at = now()
    WHERE id = p_program_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
