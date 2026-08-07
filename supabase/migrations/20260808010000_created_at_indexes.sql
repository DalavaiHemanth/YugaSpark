-- created_at indexes for InsightsPanel time-range filtering
-- These support the .gte("created_at", sinceIso) queries added to InsightsPanel

CREATE INDEX IF NOT EXISTS idx_registrations_created_at
  ON public.registrations(created_at);

CREATE INDEX IF NOT EXISTS idx_hackathon_results_created_at
  ON public.hackathon_results(created_at);

CREATE INDEX IF NOT EXISTS idx_squads_created_at
  ON public.squads(created_at);

CREATE INDEX IF NOT EXISTS idx_profiles_created_at
  ON public.profiles(created_at);
