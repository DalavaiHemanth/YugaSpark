ALTER TABLE public.hackathons
  ADD COLUMN IF NOT EXISTS registration_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS banner_url text;

ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.squad_members ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'joined';
UPDATE public.squad_members SET status = 'joined' WHERE status IS NULL;

CREATE POLICY "sm_update_leader" ON public.squad_members
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.squads s WHERE s.id = squad_members.squad_id AND s.leader_id = auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.squads s WHERE s.id = squad_members.squad_id AND s.leader_id = auth.uid())
  );