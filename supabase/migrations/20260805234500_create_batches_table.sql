-- Create Batches Management Table
CREATE TABLE IF NOT EXISTS public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed initial standard batches if empty
INSERT INTO public.batches (name, is_active, notes)
VALUES 
  ('2022-2026', false, '4th Year Cohort'),
  ('2023-2027', true, 'Current Active Club Batch'),
  ('2024-2028', false, '2nd Year Cohort'),
  ('2025-2029', false, '1st Year Cohort')
ON CONFLICT (name) DO NOTHING;

GRANT ALL ON public.batches TO authenticated, service_role;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batches_read" ON public.batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "batches_admin" ON public.batches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
