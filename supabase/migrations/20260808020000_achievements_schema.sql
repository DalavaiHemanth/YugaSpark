-- Migration for Club Achievements & Legacy Showcase
-- 1. Create club_years table
CREATE TABLE IF NOT EXISTS public.club_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_label TEXT NOT NULL UNIQUE, -- e.g. "2024-25"
  tagline TEXT,
  member_count INT DEFAULT 0,
  hackathons_count INT DEFAULT 0,
  wins_count INT DEFAULT 0,
  cover_image_url TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create club_achievements table
CREATE TABLE IF NOT EXISTS public.club_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_id UUID NOT NULL REFERENCES public.club_years(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('moment', 'gallery', 'win', 'lead')),
  title TEXT NOT NULL,
  description TEXT,
  person_name TEXT,
  role TEXT,
  image_url TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_club_years_order ON public.club_years(display_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_club_achievements_year_id ON public.club_achievements(year_id);
CREATE INDEX IF NOT EXISTS idx_club_achievements_kind ON public.club_achievements(kind);
CREATE INDEX IF NOT EXISTS idx_achievements_year_order ON public.club_achievements(year_id, display_order);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.club_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_achievements ENABLE ROW LEVEL SECURITY;

-- Public READ access for both anon and authenticated users
DROP POLICY IF EXISTS "Public select access for club_years" ON public.club_years;
CREATE POLICY "Public select access for club_years"
  ON public.club_years
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Public select access for club_achievements" ON public.club_achievements;
CREATE POLICY "Public select access for club_achievements"
  ON public.club_achievements
  FOR SELECT
  TO public
  USING (true);

-- Admin WRITE access (INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Admin write access for club_years" ON public.club_years;
CREATE POLICY "Admin write access for club_years"
  ON public.club_years
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admin write access for club_achievements" ON public.club_achievements;
CREATE POLICY "Admin write access for club_achievements"
  ON public.club_achievements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- 5. Storage RLS Policies for photos bucket (Enables Admin file uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public select for photos bucket" ON storage.objects;
CREATE POLICY "Public select for photos bucket"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "Authenticated upload for photos bucket" ON storage.objects;
CREATE POLICY "Authenticated upload for photos bucket"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos');

DROP POLICY IF EXISTS "Authenticated update for photos bucket" ON storage.objects;
CREATE POLICY "Authenticated update for photos bucket"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "Authenticated delete for photos bucket" ON storage.objects;
CREATE POLICY "Authenticated delete for photos bucket"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photos');
