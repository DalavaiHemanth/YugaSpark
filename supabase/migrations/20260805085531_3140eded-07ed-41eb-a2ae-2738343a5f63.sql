CREATE TABLE public.hackathon_results (
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
CREATE POLICY hr_read ON public.hackathon_results FOR SELECT TO authenticated USING (true);
CREATE POLICY hr_admin_write ON public.hackathon_results FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.squads (
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
CREATE POLICY squads_read ON public.squads FOR SELECT TO authenticated USING (true);
CREATE POLICY squads_insert ON public.squads FOR INSERT TO authenticated WITH CHECK (leader_id = auth.uid());
CREATE POLICY squads_update ON public.squads FOR UPDATE TO authenticated USING (leader_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (leader_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY squads_delete ON public.squads FOR DELETE TO authenticated USING (leader_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.squad_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (squad_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.squad_members TO authenticated;
GRANT ALL ON public.squad_members TO service_role;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_read ON public.squad_members FOR SELECT TO authenticated USING (true);
CREATE POLICY sm_insert ON public.squad_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY sm_delete ON public.squad_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.squads s WHERE s.id = squad_id AND s.leader_id = auth.uid()));

CREATE TABLE public.resources (
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
CREATE POLICY resources_read ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY resources_admin ON public.resources FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.messages (
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
CREATE POLICY messages_read ON public.messages FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY messages_insert ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND (student_id = auth.uid() OR public.has_role(auth.uid(),'admin')));
CREATE POLICY messages_delete ON public.messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'announcement',
  title text NOT NULL,
  body text,
  link text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY notices_read ON public.notices FOR SELECT TO authenticated USING (true);
CREATE POLICY notices_admin ON public.notices FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.poll_votes (
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
CREATE POLICY pv_read ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY pv_insert ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY pv_update ON public.poll_votes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY pv_delete ON public.poll_votes FOR DELETE TO authenticated USING (user_id = auth.uid());