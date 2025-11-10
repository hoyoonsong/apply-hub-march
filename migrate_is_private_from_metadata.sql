-- ============================================
-- Migrate is_private from metadata to column
-- ============================================
-- This script migrates any programs that have is_private in metadata
-- to the new is_private column, then removes it from metadata

-- Step 1: Ensure the column exists (safe to run even if it already exists)
ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Update is_private column from metadata for any programs that have it
-- This handles programs that were marked as private before the column existed
UPDATE public.programs
SET is_private = CASE
  WHEN (metadata->>'is_private')::boolean = true THEN true
  ELSE is_private  -- Keep existing value if metadata doesn't have it or is false
END
WHERE metadata ? 'is_private' AND (metadata->>'is_private')::boolean = true;

-- Step 3: Remove is_private from metadata (cleanup)
-- Only remove if it exists and we've migrated it
UPDATE public.programs
SET metadata = metadata - 'is_private'
WHERE metadata ? 'is_private' AND is_private = (metadata->>'is_private')::boolean;

-- Step 4: Verify the migration
-- Run this to check which programs are private:
-- SELECT id, name, is_private, metadata->>'is_private' as metadata_is_private 
-- FROM public.programs 
-- WHERE is_private = true OR (metadata ? 'is_private' AND (metadata->>'is_private')::boolean = true)
-- ORDER BY name;

