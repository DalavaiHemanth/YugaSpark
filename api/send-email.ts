import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, sendError } from "./_lib/auth.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { sendBatch } from "./_lib/email.js";
import { checkRateLimit, LIMITS } from "./_lib/rate-limit.js";

type SendInput = {
  subject: string;
  body: string;
  kind?: string;
  hackathonId?: string | null;
  recipients: { email: string; name?: string | null }[];
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let ctx;
  try {
    ctx = await requireAuth(req);
  } catch (err: unknown) {
    const e = err as { message: string; status?: number };
    return sendError(res, e.message, e.status ?? 401);
  }

  // Rate limit: 3 email sends per minute per admin
  const rl = checkRateLimit(ctx.userId, { route: "send-email", ...LIMITS["send-email"] });
  if (!rl.allowed) {
    return res.status(429).json({ error: `Rate limit exceeded. Try again in ${Math.ceil(rl.resetMs / 1000)}s.` });
  }

  try {
    const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
      _user_id: ctx.userId,
      _role: "admin",
    });
    if (!isAdmin) return sendError(res, "Forbidden", 403);

    const body = req.body as SendInput;

    // Validate
    const subject = String(body?.subject ?? "").trim();
    const msgBody = String(body?.body ?? "").trim();
    if (subject.length < 3 || subject.length > 200)
      return sendError(res, "Subject must be 3–200 characters");
    if (msgBody.length < 5 || msgBody.length > 20000)
      return sendError(res, "Message must be 5–20000 characters");

    const seen = new Set<string>();
    const recipients = (Array.isArray(body?.recipients) ? body.recipients : [])
      .map((r) => ({
        email: String(r.email ?? "")
          .trim()
          .toLowerCase(),
        name: r.name ?? null,
      }))
      .filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))
      .filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)));

    if (recipients.length === 0) return sendError(res, "No valid recipients");
    if (recipients.length > 500) return sendError(res, "Maximum 500 recipients per send");

    const kind = ["broadcast", "announcement", "results"].includes(String(body?.kind))
      ? String(body.kind)
      : "broadcast";

    // Get from address from settings
    const { data: settings } = await ctx.supabase
      .from("app_settings")
      .select("key,value")
      .in("key", ["email_from_name", "email_from_address", "email_reply_to", "smtp_user"]);

    const map = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value as string]));
    const fromAddress = (
      map["email_from_address"] ||
      map["smtp_user"] ||
      process.env["SMTP_USER"] ||
      ""
    ).trim();
    const fromName = (map["email_from_name"] ?? "Yuga Spark").trim();
    const replyTo = (map["email_reply_to"] ?? "").trim() || null;

    const outcomes = await sendBatch({
      from: fromAddress ? `${fromName} <${fromAddress}>` : undefined,
      replyTo,
      subject,
      body: msgBody,
      recipients,
    });

    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin.from("email_logs").insert(
      outcomes.map((o) => ({
        recipient: o.email,
        recipient_name: o.name,
        subject,
        body: msgBody.slice(0, 4000),
        kind,
        hackathon_id: body?.hackathonId ?? null,
        status: o.status,
        error: o.error,
        provider_id: o.providerId,
        sent_by: ctx.userId,
      })),
    );

    const sent = outcomes.filter((o) => o.status === "sent").length;
    return res.status(200).json({
      sent,
      failed: outcomes.length - sent,
      firstError: outcomes.find((o) => o.error)?.error ?? null,
    });
  } catch (err) {
    console.error("[send-email]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
