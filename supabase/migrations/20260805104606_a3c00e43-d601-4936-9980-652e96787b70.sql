CREATE TABLE public.audit_logs (
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

CREATE POLICY audit_logs_admin_read ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs (entity);

-- Helper used by triggers and by server-side admin actions
CREATE OR REPLACE FUNCTION public.write_audit(
  _action text,
  _entity text,
  _entity_id text,
  _summary text,
  _details jsonb DEFAULT '{}'::jsonb,
  _actor uuid DEFAULT auth.uid()
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _email text;
BEGIN
  SELECT email INTO _email FROM public.profiles WHERE id = _actor;
  INSERT INTO public.audit_logs (actor_id, actor_email, action, entity, entity_id, summary, details)
  VALUES (_actor, _email, _action, _entity, _entity_id, _summary, COALESCE(_details, '{}'::jsonb));
END; $$;

REVOKE EXECUTE ON FUNCTION public.write_audit(text, text, text, text, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.write_audit(text, text, text, text, jsonb, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.audit_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _entity text := TG_ARGV[0];
  _id text;
  _summary text;
  _details jsonb := '{}'::jsonb;
  _action text := lower(TG_OP);
  _changed jsonb := '{}'::jsonb;
  _k text;
  _old jsonb;
  _new jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _old := to_jsonb(OLD);
    _id := COALESCE(_old->>'id', _old->>'key', _old->>'email');
    _details := jsonb_build_object('before', _old);
  ELSIF TG_OP = 'INSERT' THEN
    _new := to_jsonb(NEW);
    _id := COALESCE(_new->>'id', _new->>'key', _new->>'email');
    _details := jsonb_build_object('after', _new);
  ELSE
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);
    _id := COALESCE(_new->>'id', _new->>'key', _new->>'email');
    FOR _k IN SELECT jsonb_object_keys(_new) LOOP
      IF (_new->_k) IS DISTINCT FROM (_old->_k) AND _k <> 'updated_at' THEN
        _changed := _changed || jsonb_build_object(_k, jsonb_build_object('from', _old->_k, 'to', _new->_k));
      END IF;
    END LOOP;
    IF _changed = '{}'::jsonb THEN
      RETURN NULL;
    END IF;
    _details := jsonb_build_object('changed', _changed);
  END IF;

  _summary := CASE _entity
    WHEN 'student' THEN 'Student record ' || _action || 'd'
    WHEN 'hackathon' THEN 'Hackathon ' || _action || 'd'
    WHEN 'access' THEN 'Access setting ' || _action || 'd'
    WHEN 'allowed_email' THEN 'Allowed email ' || _action || 'd'
    ELSE _entity || ' ' || _action || 'd'
  END;

  IF _entity = 'hackathon' THEN
    _summary := _summary || ': ' || COALESCE(_new->>'title', _old->>'title', '');
  ELSIF _entity = 'student' THEN
    _summary := _summary || ': ' || COALESCE(_new->>'email', _old->>'email', '');
  ELSIF _entity = 'allowed_email' THEN
    _summary := _summary || ': ' || COALESCE(_new->>'email', _old->>'email', '');
  ELSIF _entity = 'access' THEN
    _summary := _summary || ': ' || COALESCE(_new->>'key', _old->>'key', '') || ' = ' || COALESCE(_new->>'value', _old->>'value', '');
  END IF;

  PERFORM public.write_audit(_action, _entity, _id, _summary, _details, auth.uid());
  RETURN NULL;
END; $$;

CREATE TRIGGER audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_changes('student');

CREATE TRIGGER audit_hackathons
AFTER INSERT OR UPDATE OR DELETE ON public.hackathons
FOR EACH ROW EXECUTE FUNCTION public.audit_changes('hackathon');

CREATE TRIGGER audit_app_settings
AFTER INSERT OR UPDATE OR DELETE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.audit_changes('access');

CREATE TRIGGER audit_allowed_emails
AFTER INSERT OR UPDATE OR DELETE ON public.allowed_emails
FOR EACH ROW EXECUTE FUNCTION public.audit_changes('allowed_email');