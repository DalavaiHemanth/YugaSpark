import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, sendError } from "./_lib/auth.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { checkRateLimit, LIMITS } from "./_lib/rate-limit.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let ctx;
  try {
    ctx = await requireAuth(req);
  } catch (err: unknown) {
    const e = err as { message: string; status?: number };
    return sendError(res, e.message, e.status ?? 401);
  }

  // Rate limit: 10 password resets per minute per admin
  const rl = checkRateLimit(ctx.userId, { route: "admin-set-password", ...LIMITS["admin-set-password"] });
  if (!rl.allowed) {
    return res.status(429).json({ error: `Rate limit exceeded. Try again in ${Math.ceil(rl.resetMs / 1000)}s.` });
  }

  try {
    const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
      _user_id: ctx.userId,
      _role: "admin",
    });
    if (!isAdmin) return sendError(res, "Forbidden: admins only", 403);

    const body = req.body as { userId?: unknown; password?: unknown };
    const targetUserId = String(body?.userId ?? "");
    const password = String(body?.password ?? "");

    if (!targetUserId || password.length < 6) {
      return sendError(res, "userId and password (min 6 chars) are required");
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, { password });
    if (error) return sendError(res, error.message, 400);

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", targetUserId)
      .maybeSingle();

    await supabaseAdmin.rpc("write_audit", {
      _action: "password_reset",
      _entity: "student",
      _entity_id: targetUserId,
      _summary: `Password changed for ${target?.email ?? targetUserId}`,
      _details: { self: targetUserId === ctx.userId },
      _actor: ctx.userId,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[admin-set-password]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
