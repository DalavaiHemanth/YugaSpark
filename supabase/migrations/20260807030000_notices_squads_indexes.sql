-- Additional performance indexes for notices, polls, squads
-- Run in Supabase SQL Editor

CREATE INDEX IF NOT EXISTS idx_poll_votes_notice_id
  ON public.poll_votes(notice_id);

CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id
  ON public.poll_votes(user_id);

CREATE INDEX IF NOT EXISTS idx_notice_reactions_notice_id
  ON public.notice_reactions(notice_id);

CREATE INDEX IF NOT EXISTS idx_notice_reactions_user_id
  ON public.notice_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_notice_comments_notice_id
  ON public.notice_comments(notice_id);

CREATE INDEX IF NOT EXISTS idx_notice_comments_user_id
  ON public.notice_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_squad_members_user_id
  ON public.squad_members(user_id);

CREATE INDEX IF NOT EXISTS idx_squads_hackathon_id
  ON public.squads(hackathon_id);
