import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, sendError } from "./_lib/auth.js";
import { sendBatch } from "./_lib/email.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let ctx;
  try {
    ctx = await requireAuth(req);
  } catch (err: unknown) {
    const e = err as { message: string; status?: number };
    return sendError(res, e.message, e.status ?? 401);
  }

  try {
    const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
      _user_id: ctx.userId,
      _role: "admin",
    });
    if (!isAdmin) return sendError(res, "Forbidden: admins only", 403);

    const body = req.body as { targetEmail?: unknown };
    const targetEmail = String(body?.targetEmail ?? "")
      .trim()
      .toLowerCase();

    if (!targetEmail) return sendError(res, "targetEmail is required");

    const outcomes = await sendBatch({
      subject: "Yuga Spark — Google SMTP Connection Test",
      body: "Hello! If you are receiving this message, your Google SMTP configuration is working perfectly for Yuga Spark.",
      recipients: [{ email: targetEmail, name: "Admin Test" }],
    });

    const result = outcomes[0];
    if (result?.status === "failed") {
      return sendError(res, result.error || "SMTP test failed", 400);
    }

    return res.status(200).json({
      ok: true,
      message: `Test email sent successfully to ${targetEmail}`,
    });
  } catch (err) {
    console.error("[test-smtp]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
