REVOKE EXECUTE ON FUNCTION public.audit_changes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_changes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_changes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.write_audit(text, text, text, text, jsonb, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.write_audit(text, text, text, text, jsonb, uuid) FROM authenticated;