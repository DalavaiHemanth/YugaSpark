CREATE TABLE public.email_logs (
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

CREATE POLICY email_logs_admin_read ON public.email_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY email_logs_admin_insert ON public.email_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND sent_by = auth.uid());

CREATE INDEX email_logs_created_idx ON public.email_logs (created_at DESC);