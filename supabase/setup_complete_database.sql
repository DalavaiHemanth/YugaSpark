-- ==========================================
-- Yuga Spark Complete Database Schema Setup
-- Run this script in Supabase Dashboard -> SQL Editor
-- URL: https://supabase.com/dashboard/project/lxlryibquuaqwfdopgkd/editor
-- ==========================================

-- 1. Create app_role Enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'student');
  END IF;
END $$;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  registration_number text,
  year text,
  personal_email text,
  photo_url text,
  resume_url text,
  profile_completed boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Helper Functions: has_role and is_owner
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND lower(p.email) IN ('jayakrushna1622@gmail.com', 'hemanthleads@gmail.com')
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated, service_role;

-- 5. Profiles & User Roles RLS Policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON public.user_roles;
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- 6. Allowed Emails Table
CREATE TABLE IF NOT EXISTS public.allowed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allowed_emails TO authenticated;
GRANT ALL ON public.allowed_emails TO service_role;
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allowed_emails_owner_all ON public.allowed_emails;
CREATE POLICY allowed_emails_owner_all ON public.allowed_emails
  FOR ALL TO authenticated
  USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));

-- 7. App Settings Table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_read_all ON public.app_settings;
CREATE POLICY app_settings_read_all ON public.app_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS app_settings_owner_write ON public.app_settings;
CREATE POLICY app_settings_owner_write ON public.app_settings FOR ALL TO authenticated
  USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));

INSERT INTO public.app_settings (key, value) VALUES ('access_mode','open') ON CONFLICT (key) DO NOTHING;

-- 8. Hackathons Table
CREATE TABLE IF NOT EXISTS public.hackathons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  venue text,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  team_min integer NOT NULL DEFAULT 1,
  team_max integer NOT NULL DEFAULT 4,
  certificate_mode text NOT NULL DEFAULT 'auto',
  registration_open boolean NOT NULL DEFAULT true,
  registration_deadline timestamptz,
  mode text NOT NULL DEFAULT 'offline',
  banner_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hackathons TO authenticated;
GRANT ALL ON public.hackathons TO service_role;
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hackathons_read_all" ON public.hackathons;
CREATE POLICY "hackathons_read_all" ON public.hackathons FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "hackathons_admin_write" ON public.hackathons;
CREATE POLICY "hackathons_admin_write" ON public.hackathons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 9. Registrations Table
CREATE TABLE IF NOT EXISTS public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hackathon_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registrations_select_own_or_admin" ON public.registrations;
CREATE POLICY "registrations_select_own_or_admin" ON public.registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "registrations_insert_own" ON public.registrations;
CREATE POLICY "registrations_insert_own" ON public.registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "registrations_delete_own_or_admin" ON public.registrations;
CREATE POLICY "registrations_delete_own_or_admin" ON public.registrations FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- 10. Hackathon Results Table
CREATE TABLE IF NOT EXISTS public.hackathon_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attended boolean NOT NULL DEFAULT true,
  placement integer,
  points integer NOT NULL DEFAULT 0,
  certificate_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hackathon_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hackathon_results TO authenticated;
GRANT ALL ON public.hackathon_results TO service_role;
ALTER TABLE public.hackathon_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hr_read ON public.hackathon_results;
CREATE POLICY hr_read ON public.hackathon_results FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS hr_admin_write ON public.hackathon_results;
CREATE POLICY hr_admin_write ON public.hackathon_results FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 11. Squads and Squad Members
CREATE TABLE IF NOT EXISTS public.squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  name text NOT NULL,
  pitch text,
  looking boolean NOT NULL DEFAULT true,
  leader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.squads TO authenticated;
GRANT ALL ON public.squads TO service_role;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS squads_read ON public.squads;
CREATE POLICY squads_read ON public.squads FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS squads_insert ON public.squads;
CREATE POLICY squads_insert ON public.squads FOR INSERT TO authenticated WITH CHECK (leader_id = auth.uid());
DROP POLICY IF EXISTS squads_update ON public.squads;
CREATE POLICY squads_update ON public.squads FOR UPDATE TO authenticated USING (leader_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (leader_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS squads_delete ON public.squads;
CREATE POLICY squads_delete ON public.squads FOR DELETE TO authenticated USING (leader_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.squad_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'joined',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (squad_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.squad_members TO authenticated;
GRANT ALL ON public.squad_members TO service_role;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sm_read ON public.squad_members;
CREATE POLICY sm_read ON public.squad_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS sm_insert ON public.squad_members;
CREATE POLICY sm_insert ON public.squad_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS sm_delete ON public.squad_members;
CREATE POLICY sm_delete ON public.squad_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.squads s WHERE s.id = squad_id AND s.leader_id = auth.uid()));

-- 12. Resources Table
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  url text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resources_read ON public.resources;
CREATE POLICY resources_read ON public.resources FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS resources_admin ON public.resources;
CREATE POLICY resources_admin ON public.resources FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 13. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_read ON public.messages;
CREATE POLICY messages_read ON public.messages FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_owner(auth.uid()));
DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND (student_id = auth.uid() OR public.is_owner(auth.uid())));
DROP POLICY IF EXISTS messages_delete ON public.messages;
CREATE POLICY messages_delete ON public.messages FOR DELETE TO authenticated USING (public.is_owner(auth.uid()));

-- 14. Notices & Polls
CREATE TABLE IF NOT EXISTS public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'announcement',
  title text NOT NULL,
  body text,
  link text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notices_read ON public.notices;
CREATE POLICY notices_read ON public.notices FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS notices_admin ON public.notices;
CREATE POLICY notices_admin ON public.notices FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id uuid NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notice_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pv_read ON public.poll_votes;
CREATE POLICY pv_read ON public.poll_votes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS pv_insert ON public.poll_votes;
CREATE POLICY pv_insert ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS pv_update ON public.poll_votes;
CREATE POLICY pv_update ON public.poll_votes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS pv_delete ON public.poll_votes;
CREATE POLICY pv_delete ON public.poll_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 15. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_admin_read ON public.audit_logs;
CREATE POLICY audit_logs_admin_read ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs (entity);

-- 16. Email Logs Table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  body text,
  kind text NOT NULL DEFAULT 'broadcast',
  hackathon_id uuid REFERENCES public.hackathons(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'sent',
  error text,
  provider_id text,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.email_logs TO authenticated;
GRANT ALL ON public.email_logs TO service_role;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_logs_admin_read ON public.email_logs;
CREATE POLICY email_logs_admin_read ON public.email_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS email_logs_admin_insert ON public.email_logs;
CREATE POLICY email_logs_admin_insert ON public.email_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND sent_by = auth.uid());

CREATE INDEX IF NOT EXISTS email_logs_created_idx ON public.email_logs (created_at DESC);

-- 17. Leaderboard & RPC Functions
CREATE OR REPLACE FUNCTION public.get_leaderboard(_hackathon_id uuid DEFAULT NULL)
RETURNS TABLE (user_id uuid, full_name text, photo_url text, points bigint, wins bigint, events bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.user_id,
         COALESCE(p.full_name, split_part(p.email, '@', 1)) AS full_name,
         p.photo_url,
         SUM(r.points)::bigint AS points,
         COUNT(*) FILTER (WHERE r.placement IS NOT NULL AND r.placement <= 3)::bigint AS wins,
         COUNT(*) FILTER (WHERE r.attended)::bigint AS events
  FROM public.hackathon_results r
  JOIN public.profiles p ON p.id = r.user_id
  WHERE (_hackathon_id IS NULL OR r.hackathon_id = _hackathon_id)
  GROUP BY r.user_id, p.full_name, p.email, p.photo_url
  ORDER BY points DESC, wins DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(uuid) TO authenticated;

-- 18. Triggers
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS hackathons_updated_at ON public.hackathons;
CREATE TRIGGER hackathons_updated_at BEFORE UPDATE ON public.hackathons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 19. Storage Buckets (photos & resumes)
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "own_files_select" ON storage.objects;
CREATE POLICY "own_files_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('photos','resumes') AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));

DROP POLICY IF EXISTS "own_files_insert" ON storage.objects;
CREATE POLICY "own_files_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('photos','resumes') AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "own_files_update" ON storage.objects;
CREATE POLICY "own_files_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('photos','resumes') AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "own_files_delete" ON storage.objects;
CREATE POLICY "own_files_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('photos','resumes') AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));

-- 20. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON public.registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_hackathon_id ON public.registrations(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_results_user_id ON public.hackathon_results(user_id);
CREATE INDEX IF NOT EXISTS idx_hackathons_event_date ON public.hackathons(event_date ASC);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
