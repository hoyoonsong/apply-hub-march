-- ============================================
-- Add is_private column to programs table
-- ============================================

-- Add is_private column (defaults to false for existing programs)
ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient filtering of public programs
CREATE INDEX IF NOT EXISTS programs_is_private_idx 
ON public.programs(is_private) 
WHERE is_private = false;

-- Add comment to document the column
COMMENT ON COLUMN public.programs.is_private IS 
'If true, program will not appear in public listings (homepage, org pages, coalition pages) but will still be accessible via direct link';

