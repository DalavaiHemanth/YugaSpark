/**
 * Client-side wrappers for email admin operations.
 * Formerly used @tanstack/react-start createServerFn — now plain fetch() calls to Vercel API routes.
 */
import { supabase } from "@/integrations/supabase/client";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: "Request failed" }))) as {
      error?: string;
    };
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

type SendInput = {
  subject: string;
  body: string;
  bannerUrl?: string | null;
  attachments?: { filename: string; content: string; contentType?: string }[];
  kind?: string;
  hackathonId?: string | null;
  recipients: { email: string; name?: string | null }[];
};

/** Admin-only: delivers an email to each recipient via Google SMTP and records every attempt. */
export async function sendClubEmail(opts: {
  data: SendInput;
}): Promise<{ sent: number; failed: number; firstError: string | null }> {
  return post("/api/send-email", opts.data);
}

/** Admin-only: tests SMTP connection by sending a test email to the specified target address. */
export async function testSmtpConnection(opts: {
  data: { targetEmail: string };
}): Promise<{ ok: boolean; message: string }> {
  return post("/api/test-smtp", opts.data);
}