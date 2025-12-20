-- ============================================
-- FIX APPLICATION_REVIEWS CONSTRAINT
-- Fixes the duplicate key error when unfinalizing
-- ============================================

-- Drop the old constraint that only allows one review per application
ALTER TABLE public.application_reviews 
DROP CONSTRAINT IF EXISTS application_reviews_application_id_key;

-- Add composite unique constraint to allow multiple reviewers per application
-- This ensures one review per (application, reviewer) pair
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'application_reviews_application_reviewer_unique'
  ) THEN
    ALTER TABLE public.application_reviews 
    ADD CONSTRAINT application_reviews_application_reviewer_unique 
    UNIQUE (application_id, reviewer_id);
  END IF;
END $$;

