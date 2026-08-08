-- Performance Indexes for Audit Logs, Email Logs, and Resources
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_status ON public.resources(status, created_at DESC);
