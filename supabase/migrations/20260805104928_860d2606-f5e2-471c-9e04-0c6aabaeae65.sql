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
  _verb text;
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

  _verb := CASE _action WHEN 'insert' THEN 'created' WHEN 'update' THEN 'updated' ELSE 'deleted' END;

  _summary := CASE _entity
    WHEN 'student' THEN 'Student record ' || _verb
    WHEN 'hackathon' THEN 'Hackathon ' || _verb
    WHEN 'access' THEN 'Access setting ' || _verb
    WHEN 'allowed_email' THEN 'Allowed email ' || _verb
    ELSE initcap(_entity) || ' ' || _verb
  END;

  IF _entity = 'hackathon' THEN
    _summary := _summary || ': ' || COALESCE(_new->>'title', _old->>'title', '');
  ELSIF _entity IN ('student', 'allowed_email') THEN
    _summary := _summary || ': ' || COALESCE(_new->>'email', _old->>'email', '');
  ELSIF _entity = 'access' THEN
    _summary := _summary || ': ' || COALESCE(_new->>'key', _old->>'key', '') || ' = ' || COALESCE(_new->>'value', _old->>'value', '');
  END IF;

  PERFORM public.write_audit(_action, _entity, _id, _summary, _details, auth.uid());
  RETURN NULL;
END; $$;

REVOKE EXECUTE ON FUNCTION public.audit_changes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_changes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_changes() FROM authenticated;