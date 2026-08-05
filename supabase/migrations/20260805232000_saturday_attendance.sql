-- ==========================================
-- Saturday Club Session Attendance Tracker Tables
-- Run this script in Supabase SQL Editor
-- ==========================================

-- 1. Club Sessions Table (Saturday Sessions per Batch/Semester)
CREATE TABLE IF NOT EXISTS public.club_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  batch_semester text NOT NULL DEFAULT 'All Batches',
  topic text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_sessions TO authenticated;
GRANT ALL ON public.club_sessions TO service_role;
ALTER TABLE public.club_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_sessions_read" ON public.club_sessions;
CREATE POLICY "club_sessions_read" ON public.club_sessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "club_sessions_admin" ON public.club_sessions;
CREATE POLICY "club_sessions_admin" ON public.club_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Session Attendance Records Table
CREATE TABLE IF NOT EXISTS public.session_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.club_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'present',
  scanned_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  UNIQUE (session_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_attendance TO authenticated;
GRANT ALL ON public.session_attendance TO service_role;
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_attendance_read" ON public.session_attendance;
CREATE POLICY "session_attendance_read" ON public.session_attendance FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "session_attendance_admin" ON public.session_attendance;
CREATE POLICY "session_attendance_admin" ON public.session_attendance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_session_attendance_session ON public.session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_user ON public.session_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_club_sessions_date ON public.club_sessions(session_date DESC);
