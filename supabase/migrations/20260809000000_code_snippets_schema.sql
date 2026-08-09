-- Migration: Create Code Snippets Schema & Seed Default Templates
-- Description: Allows admins to dynamically publish, edit, and delete code snippets for the Playbook.

CREATE TABLE IF NOT EXISTS public.code_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Backend & Database',
  language TEXT NOT NULL DEFAULT 'typescript',
  description TEXT,
  code TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.code_snippets ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.code_snippets TO authenticated, anon;
GRANT ALL ON public.code_snippets TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.code_snippets TO authenticated;

-- RLS Policies
DROP POLICY IF EXISTS "code_snippets_select_all" ON public.code_snippets;
CREATE POLICY "code_snippets_select_all" ON public.code_snippets
  FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "code_snippets_admin_insert" ON public.code_snippets;
CREATE POLICY "code_snippets_admin_insert" ON public.code_snippets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "code_snippets_admin_update" ON public.code_snippets;
CREATE POLICY "code_snippets_admin_update" ON public.code_snippets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "code_snippets_admin_delete" ON public.code_snippets;
CREATE POLICY "code_snippets_admin_delete" ON public.code_snippets
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_code_snippets_category ON public.code_snippets(category);
CREATE INDEX IF NOT EXISTS idx_code_snippets_created_at ON public.code_snippets(created_at DESC);

-- Seed initial boilerplate code snippets
INSERT INTO public.code_snippets (title, category, language, description, code)
VALUES
(
  'Supabase Client & Auth Scaffold (TypeScript)',
  'Backend & Database',
  'typescript',
  'Production-ready Supabase client setup with TypeScript types.',
  'import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);'
),
(
  'FastAPI Python Backend Scaffold (CORS Enabled)',
  'Backend & Database',
  'python',
  'Quick Python REST API setup for machine learning & data processing.',
  'from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Yuga Spark Hackathon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "active", "message": "Yuga Spark API is live"}'
),
(
  'Tailwind Glassmorphism Card (CSS / JSX)',
  'UI & Frontend',
  'html',
  'Modern translucent glassmorphism container component.',
  '<div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-2xl transition-all hover:border-primary/40">
  <h3 className="font-bold text-lg text-white">Glassmorphism Card</h3>
  <p className="text-sm text-slate-300 mt-1">Sleek dark mode container for modern web apps.</p>
</div>'
),
(
  '5-Slide Winning Pitch Deck Outline',
  'Pitch & Presentation',
  'markdown',
  'Structured slide breakdown for winning hackathon presentations.',
  'Slide 1: Hook & Problem (30s) — What acute problem exists?
Slide 2: Solution & Live Demo (90s) — Showcase working MVP product flow.
Slide 3: Technical Architecture (30s) — Stack: Frontend, Database, APIs, AI models.
Slide 4: Market Impact & Future Roadmap (30s) — Real-world feasibility & next steps.
Slide 5: Team & Call to Action (0s) — Member roles & contact details.'
)
ON CONFLICT DO NOTHING;
