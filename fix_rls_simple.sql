-- Temporarily make the policy more permissive for testing
-- This will allow any authenticated user to read/write attachments

-- Drop existing policies
DROP POLICY IF EXISTS "auth read attachments" ON public.application_attachments;
DROP POLICY IF EXISTS "auth insert attachments" ON public.application_attachments;
DROP POLICY IF EXISTS "uploader delete attachments" ON public.application_attachments;

-- Create simpler policies that work
CREATE POLICY "auth read attachments"
ON public.application_attachments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "auth insert attachments"
ON public.application_attachments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "auth delete attachments"
ON public.application_attachments
FOR DELETE
TO authenticated
USING (true);
