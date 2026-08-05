import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SendInput = {
  subject: string;
  body: string;
  kind?: string;
  hackathonId?: string | null;
  recipients: { email: string; name?: string | null }[];
};

function validateSend(data: SendInput): SendInput {
  const subject = String(data.subject ?? "").trim();
  const body = String(data.body ?? "").trim();
  if (subject.length < 3 || subject.length > 200) throw new Error("Subject must be 3–200 characters");
  if (body.length < 5 || body.length > 20000) throw new Error("Message must be 5–20000 characters");
  const seen = new Set<string>();
  const recipients = (Array.isArray(data.recipients) ? data.recipients : [])
    .map((r) => ({ email: String(r.email ?? "").trim().toLowerCase(), name: r.name ?? null }))
    .filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))
    .filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)));
  if (recipients.length === 0) throw new Error("No valid recipients");
  if (recipients.length > 500) throw new Error("Maximum 500 recipients per send");
  const kind = ["broadcast", "announcement", "results"].includes(String(data.kind))
    ? String(data.kind)
    : "broadcast";
  return { subject, body, kind, hackathonId: data.hackathonId ?? null, recipients };
}

/** Admin-only: delivers an email to each recipient via Google SMTP and records every attempt. */
export const sendClubEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateSend)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { data: settings } = await supabase
      .from("app_settings")
      .select("key,value")
      .in("key", ["email_from_name", "email_from_address", "email_reply_to", "smtp_user"]);
    const map = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
    
    const fromAddress = (map["email_from_address"] || map["smtp_user"] || process.env["SMTP_USER"] || process.env["GMAIL_USER"] || "").trim();
    const fromName = (map["email_from_name"] ?? "Yuga Spark").trim();
    const replyTo = (map["email_reply_to"] ?? "").trim() || null;

    const { sendBatch } = await import("./email.server");
    const outcomes = await sendBatch({
      from: fromAddress ? `${fromName} <${fromAddress}>` : undefined,
      replyTo,
      subject: data.subject,
      body: data.body,
      recipients: data.recipients,
    });

    const { error: logError } = await supabase.from("email_logs").insert(
      outcomes.map((o) => ({
        recipient: o.email,
        recipient_name: o.name,
        subject: data.subject,
        body: data.body.slice(0, 4000),
        kind: data.kind ?? "broadcast",
        hackathon_id: data.hackathonId ?? null,
        status: o.status,
        error: o.error,
        provider_id: o.providerId,
        sent_by: userId,
      })),
    );
    if (logError) console.error("email log insert failed:", logError.message);

    const sent = outcomes.filter((o) => o.status === "sent").length;
    return {
      sent,
      failed: outcomes.length - sent,
      firstError: outcomes.find((o) => o.error)?.error ?? null,
    };
  });

/** Admin-only: tests SMTP connection by sending a test email to the specified target address. */
export const testSmtpConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { targetEmail: string }) => ({
    targetEmail: String(data.targetEmail).trim().toLowerCase(),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admins only");

    const { sendBatch } = await import("./email.server");
    const outcomes = await sendBatch({
      subject: "Yuga Spark — Google SMTP Connection Test",
      body: "Hello! If you are receiving this message, your Google SMTP configuration is working perfectly for Yuga Spark.",
      recipients: [{ email: data.targetEmail, name: "Admin Test" }],
    });

    const result = outcomes[0];
    if (result?.status === "failed") {
      throw new Error(result.error || "SMTP test failed");
    }

    return { ok: true, message: `Test email sent successfully to ${data.targetEmail}` };
  });