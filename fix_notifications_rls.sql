-- ============================================
-- FIX: Add RLS policies for notifications table
-- Allows users to read and update their own notifications
-- ============================================

-- Step 1: Check current RLS status (run this first to verify)
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename = 'notifications';

-- Step 2: Ensure RLS is enabled on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;

-- SELECT policy: Users can read their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- UPDATE policy: Users can update their own notifications (e.g., mark as read)
CREATE POLICY "notifications_update_own" ON public.notifications
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

-- Note: INSERT and DELETE are typically handled by backend/triggers
-- so we don't need policies for those unless users need to create/delete notifications

-- ============================================
-- OPTIMIZATION: Add index for fast unread checks
-- ============================================

-- Create composite index on (user_id, read_at) for efficient COUNT queries
-- This makes checking for unread notifications very fast
CREATE INDEX IF NOT EXISTS notifications_user_read_idx 
ON public.notifications(user_id, read_at) 
WHERE read_at IS NULL;

-- Also index user_id alone for general queries
CREATE INDEX IF NOT EXISTS notifications_user_id_idx 
ON public.notifications(user_id);

-- ============================================
-- VERIFICATION: Check that policies are active
-- ============================================
-- Run this to verify policies are created:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'notifications';

-- ============================================
-- GRANT PERMISSIONS (if needed)
-- ============================================
-- Ensure authenticated users have basic table permissions
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- ============================================
-- ENABLE REALTIME (Required for realtime subscriptions)
-- ============================================
-- Enable realtime replication for the notifications table
-- This allows realtime subscriptions to work without polling
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

