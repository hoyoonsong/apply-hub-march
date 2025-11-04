-- Public access for program viewing (for users without an account)
-- This ensures anonymous users can load program details and application schemas

-- 1) Allow anonymous SELECT on published programs
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Drop any previous anon-readable policy to avoid duplicates
DROP POLICY IF EXISTS "programs_select_published_anon" ON public.programs;

CREATE POLICY "programs_select_published_anon" ON public.programs
FOR SELECT
TO anon
USING (
  published = true AND deleted_at IS NULL
);

-- 2) Optionally, if a view `programs_public` is used by the app, just GRANT select on it
-- Note: RLS still applies to underlying tables, which the policy above handles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'programs_public'
  ) THEN
    GRANT SELECT ON public.programs_public TO anon;
  END IF;
END $$;

-- 3) Allow anonymous users to call the builder schema RPC (read-only)
-- Some environments use different function names; grant if present
DO $$
DECLARE
  fn_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'app_builder_get_v1'
  ) INTO fn_exists;

  IF fn_exists THEN
    GRANT EXECUTE ON FUNCTION app_builder_get_v1(UUID) TO anon;
  END IF;
END $$;
