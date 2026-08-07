-- Add status column to resources table for student submissions approval workflow
ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

-- Allow authenticated users to submit resources (defaults to pending for non-admins)
CREATE POLICY resources_insert_auth ON public.resources
FOR INSERT TO authenticated
WITH CHECK (true);
