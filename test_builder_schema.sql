-- Test the app_builder_get_v1 function
-- Copy and paste this into Supabase SQL Editor to test

-- First, let's see what programs exist
SELECT id, name, application_schema 
FROM programs 
WHERE id = '72ce7707-934b-4e12-906e-b3e7ac9077d5';

-- Test the RPC function
SELECT app_builder_get_v1('72ce7707-934b-4e12-906e-b3e7ac9077d5'::uuid);

-- Check if the function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'app_builder_get_v1';
