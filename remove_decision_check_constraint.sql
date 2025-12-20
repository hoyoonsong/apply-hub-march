-- ============================================
-- REMOVE CHECK CONSTRAINT ON DECISION COLUMN
-- This allows custom decisions (like "contract") to be used
-- ============================================

-- Drop the existing CHECK constraint if it exists
ALTER TABLE public.application_reviews
DROP CONSTRAINT IF EXISTS application_reviews_decision_check;

-- The decision column can now accept any text value
-- This is necessary for custom decisions used in spot claiming

