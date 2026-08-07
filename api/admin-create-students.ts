import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, sendError } from "./_lib/auth.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { checkRateLimit, LIMITS } from "./_lib/rate-limit.js";

const STUDENT_DEFAULT_PASSWORD = "yugaspark123";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let ctx;
  try {
    ctx = await requireAuth(req);
  } catch (err: unknown) {
    const e = err as { message: string; status?: number };
    return sendError(res, e.message, e.status ?? 401);
  }

  // Rate limit: 10 creates per minute per admin
  const rl = checkRateLimit(ctx.userId, { route: "admin-create-students", ...LIMITS["admin-create-students"] });
  if (!rl.allowed) {
    return res.status(429).json({ error: `Rate limit exceeded. Try again in ${Math.ceil(rl.resetMs / 1000)}s.` });
  }

  try {
    // Check admin
    const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
      _user_id: ctx.userId,
      _role: "admin",
    });
    if (!isAdmin) return sendError(res, "Forbidden: admins only", 403);

    const body = req.body as { emails?: unknown };
    const emails: string[] = (Array.isArray(body?.emails) ? body.emails : [])
      .map((e) => String(e).trim().toLowerCase())
      .filter(Boolean);

    if (emails.length === 0) return sendError(res, "emails array is required");

    const supabaseAdmin = getSupabaseAdmin();
    let created = 0;
    let existed = 0;
    const failed: string[] = [];

    for (const email of emails) {
      await supabaseAdmin.from("allowed_emails").upsert({ email }, { onConflict: "email" });
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: STUDENT_DEFAULT_PASSWORD,
        email_confirm: true,
      });
      if (!error) created += 1;
      else if (error.message.toLowerCase().includes("already")) existed += 1;
      else failed.push(email);
    }

    await supabaseAdmin.rpc("write_audit", {
      _action: "invite",
      _entity: "student",
      _entity_id: "",
      _summary: `Invited ${emails.length} student account(s) — ${created} created, ${existed} already existed`,
      _details: { emails, created, existed, failed },
      _actor: ctx.userId,
    });

    return res.status(200).json({ created, existed, failed });
  } catch (err) {
    console.error("[admin-create-students]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
