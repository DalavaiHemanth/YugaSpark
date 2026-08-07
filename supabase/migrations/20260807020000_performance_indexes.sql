-- Performance indexes for hot query paths
-- These dramatically speed up per-user dashboard queries

-- registrations.user_id — queried on every dashboard load
CREATE INDEX IF NOT EXISTS idx_registrations_user_id
  ON public.registrations(user_id);

-- hackathon_results.user_id — queried on dashboard + leaderboard
CREATE INDEX IF NOT EXISTS idx_hackathon_results_user_id
  ON public.hackathon_results(user_id);

-- session_attendance.user_id — queried on dashboard
CREATE INDEX IF NOT EXISTS idx_session_attendance_user_id
  ON public.session_attendance(user_id);

-- session_attendance.session_id — used in joins
CREATE INDEX IF NOT EXISTS idx_session_attendance_session_id
  ON public.session_attendance(session_id);

-- hackathons.event_date — used for ordering and filtering
CREATE INDEX IF NOT EXISTS idx_hackathons_event_date
  ON public.hackathons(event_date);

-- profiles.email — used for super admin email lookup
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles(email);
