CREATE OR REPLACE FUNCTION public.get_leaderboard(_hackathon_id uuid DEFAULT NULL)
RETURNS TABLE (user_id uuid, full_name text, photo_url text, points bigint, wins bigint, events bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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

CREATE OR REPLACE FUNCTION public.get_member_names()
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, COALESCE(p.full_name, split_part(p.email, '@', 1))
  FROM public.profiles p;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_member_names() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_names() TO authenticated;