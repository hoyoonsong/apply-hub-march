-- ============================================
-- ADD LOGO_URL COLUMN TO ORGANIZATIONS TABLE
-- Adds support for storing organization logos
-- ============================================

-- Add logo_url column to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS logo_url text;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.logo_url IS 'Public URL to the organization logo image';

