-- Create a working get_profile_snapshot function based on the actual schema
-- This will replace any existing broken functions

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
    -- Get the current user ID
    user_id := auth.uid();
    
    -- Return empty object if no user
    IF user_id IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;
    
    -- Build the profile object with all available fields
    SELECT jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'given_name', p.given_name,
        'family_name', p.family_name,
        'date_of_birth', CASE 
            WHEN p.date_of_birth IS NOT NULL 
            THEN to_char(p.date_of_birth, 'YYYY-MM-DD') 
            ELSE NULL 
        END,
        'phone_number', p.phone_number,
        'email', p.email,
        'address_line1', p.address_line1,
        'address_line2', p.address_line2,
        'address_city', p.address_city,
        'address_state', p.address_state,
        'address_postal_code', p.address_postal_code,
        'address_country', p.address_country,
        'personal_statement', p.personal_statement,
        'profile_files', p.profile_files,
        'resume_file', p.resume_file,
        'parent_guardian_name', p.parent_guardian_name,
        'parent_guardian_email', p.parent_guardian_email,
        'parent_guardian_phone', p.parent_guardian_phone,
        'emergency_contact_is_parent', p.emergency_contact_is_parent,
        'emergency_contact_name', p.emergency_contact_name,
        'emergency_contact_email', p.emergency_contact_email,
        'emergency_contact_phone', p.emergency_contact_phone
    ) INTO result
    FROM public.profiles p
    WHERE p.id = user_id;
    
    -- Return the result or empty object if no profile found
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_profile_snapshot() TO authenticated;

-- Add a comment explaining the function
COMMENT ON FUNCTION public.get_profile_snapshot() IS 'Returns the current user profile data as JSONB for profile autofill functionality';
