-- RPC: get_insights_counts
-- Replaces 4 separate full-table queries in InsightsPanel with a single DB function
-- Much more efficient: one round-trip, aggregation done in Postgres not in JS

CREATE OR REPLACE FUNCTION public.get_insights_counts()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_members',      (SELECT COUNT(*) FROM public.profiles),
    'active_members',     (SELECT COUNT(*) FROM public.profiles WHERE is_active = true),
    'completed_profiles', (SELECT COUNT(*) FROM public.profiles WHERE profile_completed = true),
    'total_registrations',(SELECT COUNT(*) FROM public.registrations),
    'total_results',      (SELECT COUNT(*) FROM public.hackathon_results),
    'attended_results',   (SELECT COUNT(*) FROM public.hackathon_results WHERE attended = true),
    'total_squads',       (SELECT COUNT(*) FROM public.squads),
    'total_hackathons',   (SELECT COUNT(*) FROM public.hackathons)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_insights_counts() TO authenticated;
