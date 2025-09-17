-- Restore the missing get_profile_snapshot function
-- Copy and paste this into Supabase SQL Editor

DROP FUNCTION IF EXISTS public.get_profile_snapshot(uuid);
DROP FUNCTION IF EXISTS public.get_profile_snapshot();

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

GRANT EXECUTE ON FUNCTION public.get_profile_snapshot() TO authenticated;

SELECT 'get_profile_snapshot function restored - profile autofill should work now' as status;
