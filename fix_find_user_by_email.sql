-- Fix find_user_by_email function by dropping and recreating it
-- This is needed because PostgreSQL can't change return types with CREATE OR REPLACE

-- 1. Drop the existing function first
DROP FUNCTION IF EXISTS find_user_by_email(TEXT);

-- 2. Create the new function with correct return type
CREATE OR REPLACE FUNCTION find_user_by_email(
  p_email TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user_id', u.id,
    'full_name', p.full_name,
    'email', u.email
  ) INTO result
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.email = p_email
  LIMIT 1;
  
  RETURN COALESCE(result, 'null'::json);
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION find_user_by_email(TEXT) TO authenticated;
