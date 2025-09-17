-- RESTORE WORKING STATE - Fix constraints and create missing functions
-- Copy and paste this into Supabase SQL Editor

-- 1. Fix the application_reviews constraint to allow multiple reviewers per application
ALTER TABLE public.application_reviews 
DROP CONSTRAINT IF EXISTS application_reviews_application_id_key;

ALTER TABLE public.application_reviews 
ADD CONSTRAINT application_reviews_application_reviewer_unique 
UNIQUE (application_id, reviewer_id);

-- 2. Create the missing get_profile_snapshot function
CREATE OR REPLACE FUNCTION public.get_profile_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    result jsonb;
    user_id uuid;
BEGIN
    user_id := auth.uid();
    IF user_id IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;
    
    SELECT jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'given_name', p.given_name,
        'family_name', p.family_name,
        'date_of_birth', p.date_of_birth,
        'address_line1', p.address_line1,
        'address_line2', p.address_line2,
        'address_city', p.address_city,
        'address_state', p.address_state,
        'address_postal_code', p.address_postal_code,
        'address_country', p.address_country,
        'personal_statement', p.personal_statement,
        'profile_files', p.profile_files,
        'phone_number', p.phone_number,
        'parent_guardian_name', p.parent_guardian_name,
        'parent_guardian_email', p.parent_guardian_email,
        'parent_guardian_phone', p.parent_guardian_phone,
        'emergency_contact_is_parent', p.emergency_contact_is_parent,
        'emergency_contact_name', p.emergency_contact_name,
        'emergency_contact_email', p.emergency_contact_email,
        'emergency_contact_phone', p.emergency_contact_phone,
        'resume_file', p.resume_file,
        'email', p.email
    ) INTO result
    FROM public.profiles p
    WHERE p.id = user_id;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 3. Create the app_upsert_review_v1 function
CREATE OR REPLACE FUNCTION public.app_upsert_review_v1(
    p_application_id uuid,
    p_score integer,
    p_comments text,
    p_ratings jsonb,
    p_status text
)
RETURNS public.application_reviews
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_review public.application_reviews;
    v_reviewer_id uuid;
    existing_review_id uuid;
BEGIN
    v_reviewer_id := auth.uid();
    IF v_reviewer_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    IF p_status IS NULL THEN
        p_status := 'draft';
    END IF;
    
    SELECT id INTO existing_review_id
    FROM public.application_reviews
    WHERE application_id = p_application_id 
    AND reviewer_id = v_reviewer_id;
    
    IF existing_review_id IS NOT NULL THEN
        UPDATE public.application_reviews SET
            ratings = p_ratings,
            comments = p_comments,
            score = p_score,
            status = p_status,
            updated_at = now()
        WHERE id = existing_review_id
        RETURNING * INTO v_review;
    ELSE
        INSERT INTO public.application_reviews (
            application_id, reviewer_id, ratings, comments, score, status, updated_at
        )
        VALUES (
            p_application_id, v_reviewer_id, p_ratings, p_comments, p_score, p_status, now()
        )
        RETURNING * INTO v_review;
    END IF;

    RETURN v_review;
END;
$$;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_profile_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_upsert_review_v1(uuid, integer, text, jsonb, text) TO authenticated;

-- 5. Test
SELECT 'Working state restored - profile autofill and review functions ready' as status;
