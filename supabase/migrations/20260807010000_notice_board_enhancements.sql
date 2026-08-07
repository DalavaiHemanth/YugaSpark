-- 1. Add is_pinned and priority columns to public.notices
ALTER TABLE public.notices
ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';

-- 2. Notice Reactions Table
CREATE TABLE IF NOT EXISTS public.notice_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id uuid NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notice_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.notice_reactions TO authenticated;
GRANT ALL ON public.notice_reactions TO service_role;
ALTER TABLE public.notice_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nr_select ON public.notice_reactions;
CREATE POLICY nr_select ON public.notice_reactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS nr_insert ON public.notice_reactions;
CREATE POLICY nr_insert ON public.notice_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS nr_delete ON public.notice_reactions;
CREATE POLICY nr_delete ON public.notice_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 3. Notice Comments Table
CREATE TABLE IF NOT EXISTS public.notice_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id uuid NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.notice_comments TO authenticated;
GRANT ALL ON public.notice_comments TO service_role;
ALTER TABLE public.notice_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nc_select ON public.notice_comments;
CREATE POLICY nc_select ON public.notice_comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS nc_insert ON public.notice_comments;
CREATE POLICY nc_insert ON public.notice_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS nc_delete ON public.notice_comments;
CREATE POLICY nc_delete ON public.notice_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
