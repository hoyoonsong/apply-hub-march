-- Test script to verify superadmin_forms RLS is working
-- Run this in Supabase SQL Editor to debug

-- 1. First, test if the is_superadmin() function works
SELECT public.is_superadmin() as is_superadmin_check;

-- 2. Check your current user's profile
SELECT id, role, deleted_at 
FROM public.profiles 
WHERE id = auth.uid();

-- 3. Try to select from superadmin_forms directly
SELECT COUNT(*) as total_submissions FROM public.superadmin_forms;

-- 4. Check what policies exist on the table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'superadmin_forms';

-- 5. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'superadmin_forms';

