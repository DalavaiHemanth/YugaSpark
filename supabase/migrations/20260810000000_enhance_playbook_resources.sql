-- Migration: Enhance resources table for multi-photo carousels, eBook PDFs, extra links and high-performance indexing

ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS slide_images text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS ebook_pdf_url text,
ADD COLUMN IF NOT EXISTS extra_links jsonb DEFAULT '[]'::jsonb;

-- Composite B-Tree index for fetching approved resources ordered by creation date
-- Prevents full table scans and ensures zero query lag on Playbook page loads
CREATE INDEX IF NOT EXISTS idx_resources_status_created_at
  ON public.resources(status, created_at DESC);

-- Index for category-based filtering and status lookups
CREATE INDEX IF NOT EXISTS idx_resources_category_status
  ON public.resources(category, status);
