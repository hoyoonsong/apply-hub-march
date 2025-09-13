-- Create application_attachments table
CREATE TABLE IF NOT EXISTS public.application_attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  content_type text,
  size_bytes bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_application_attachments_application_id 
ON public.application_attachments(application_id);

-- Enable RLS
ALTER TABLE public.application_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert attachments for their applications" ON public.application_attachments;
DROP POLICY IF EXISTS "Users can read attachments for their applications" ON public.application_attachments;
DROP POLICY IF EXISTS "Reviewers can read all attachments" ON public.application_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.application_attachments;

-- RLS Policies
-- Allow authenticated users to insert attachments for applications they have access to
CREATE POLICY "Users can insert attachments for their applications" 
ON public.application_attachments FOR INSERT 
TO authenticated 
WITH CHECK (
  application_id IN (
    SELECT id FROM public.applications 
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to read attachments for applications they have access to
CREATE POLICY "Users can read attachments for their applications" 
ON public.application_attachments FOR SELECT 
TO authenticated 
USING (
  application_id IN (
    SELECT id FROM public.applications 
    WHERE user_id = auth.uid()
  )
);

-- Allow reviewers and admins to read all attachments
CREATE POLICY "Reviewers can read all attachments" 
ON public.application_attachments FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.reviewers r 
    WHERE r.user_id = auth.uid() 
    AND r.scope_type = 'program' 
    AND r.scope_id IN (
      SELECT program_id FROM public.applications 
      WHERE id = application_id
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.admins a 
    WHERE a.user_id = auth.uid() 
    AND (a.scope_type = 'org' OR a.scope_type = 'program')
  )
);

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their own attachments" 
ON public.application_attachments FOR DELETE 
TO authenticated 
USING (
  application_id IN (
    SELECT id FROM public.applications 
    WHERE user_id = auth.uid()
  )
);
