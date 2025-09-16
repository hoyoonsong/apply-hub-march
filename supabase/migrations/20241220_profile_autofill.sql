-- =========================
-- PROFILE AUTOFILL — MIGRATION
-- =========================

-- 1) Add profile fields to public.profiles (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='given_name'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN given_name text,
      ADD COLUMN family_name text,
      ADD COLUMN date_of_birth date,
      ADD COLUMN address_line1 text,
      ADD COLUMN address_line2 text,
      ADD COLUMN address_city text,
      ADD COLUMN address_state text,
      ADD COLUMN address_postal_code text,
      ADD COLUMN address_country text,
      ADD COLUMN personal_statement text,
      ADD COLUMN profile_files jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  -- If a prior experiment column exists, rename it forward
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='common_app_files'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='profile_files'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN common_app_files TO profile_files;
  END IF;
END$$;

-- 2) Normalize per-program flags:
--    metadata.application.profile.enabled + metadata.form.include_profile
UPDATE public.programs p
SET metadata = jsonb_strip_nulls(
  COALESCE(p.metadata,'{}'::jsonb)
  || jsonb_build_object(
       'application', jsonb_build_object(
         'profile', jsonb_build_object(
           'enabled', COALESCE(
             (p.metadata->'application'->'profile'->>'enabled')::boolean,
             (p.metadata->'application'->'common'->>'applyhub')::boolean,    -- legacy shim if present
             (p.metadata->'form'->>'include_common_app')::boolean,           -- legacy shim if present
             false
           )
         )
       )
     )
  || jsonb_build_object(
       'form', jsonb_build_object(
         'include_profile', COALESCE(
           (p.metadata->'form'->>'include_profile')::boolean,
           (p.metadata->'form'->>'include_common_app')::boolean,             -- legacy shim if present
           (p.metadata->'application'->'common'->>'applyhub')::boolean,      -- legacy shim if present
           false
         ),
         'include_coalition_common_app', COALESCE((p.metadata->'form'->>'include_coalition_common_app')::boolean, false)
       )
     )
)
#- '{application,common}'
#- '{form,include_common_app}';

-- 3) RPC to fetch the signed-in user's profile snapshot JSON
DROP FUNCTION IF EXISTS public.get_profile_snapshot(uuid);
DROP FUNCTION IF EXISTS public.get_profile_snapshot();

CREATE OR REPLACE FUNCTION public.get_profile_snapshot(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT jsonb_strip_nulls(
    jsonb_build_object(
      'full_name', NULLIF(TRIM(COALESCE(full_name,'')), ''),
      'given_name', given_name,
      'family_name', family_name,
      'date_of_birth', CASE WHEN date_of_birth IS NULL THEN NULL ELSE to_char(date_of_birth, 'YYYY-MM-DD') END,
      'address', jsonb_strip_nulls(jsonb_build_object(
        'line1', address_line1,
        'line2', address_line2,
        'city', address_city,
        'state', address_state,
        'postal_code', address_postal_code,
        'country', address_country
      )),
      'personal_statement', NULLIF(TRIM(COALESCE(personal_statement,'')),''),
      'files', COALESCE(profile_files, '[]'::jsonb)
    )
  )
  FROM public.profiles
  WHERE id = p_user_id;
$$;

-- 4) RLS conveniences on profiles (create-if-missing; do NOT toggle RLS state here)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select_own'
  ) THEN
    CREATE POLICY profiles_select_own ON public.profiles
      FOR SELECT USING (id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_own'
  ) THEN
    CREATE POLICY profiles_update_own ON public.profiles
      FOR UPDATE USING (id = auth.uid());
  END IF;
END$$;

-- 5) Back-compat: mirror old answers.common_app → answers.profile (one-time, non-destructive)
UPDATE public.applications a
SET answers = COALESCE(a.answers,'{}'::jsonb)
             || CASE
                  WHEN (a.answers ? 'profile') THEN '{}'::jsonb
                  WHEN (a.answers ? 'common_app') THEN jsonb_build_object('profile', a.answers->'common_app')
                  ELSE '{}'::jsonb
                END;
