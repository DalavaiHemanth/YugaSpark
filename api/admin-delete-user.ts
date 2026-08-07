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

  // Rate limit: 20 deletes per minute per admin
  const rl = checkRateLimit(ctx.userId, { route: "admin-delete-user", ...LIMITS["admin-delete-user"] });
  if (!rl.allowed) {
    return res.status(429).json({ error: `Rate limit exceeded. Try again in ${Math.ceil(rl.resetMs / 1000)}s.` });
  }

  try {
    const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
      _user_id: ctx.userId,
      _role: "admin",
    });
    if (!isAdmin) return sendError(res, "Forbidden: admins only", 403);

    const body = req.body as { userId?: unknown };
    const targetUserId = String(body?.userId ?? "");

    if (!targetUserId) return sendError(res, "userId is required");
    if (targetUserId === ctx.userId) {
      return sendError(res, "You cannot delete your own account", 400);
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", targetUserId)
      .maybeSingle();

    const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (error) return sendError(res, error.message, 400);

    await supabaseAdmin.rpc("write_audit", {
      _action: "delete",
      _entity: "student",
      _entity_id: targetUserId,
      _summary: `Account removed: ${target?.email ?? targetUserId}`,
      _details: {},
      _actor: ctx.userId,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[admin-delete-user]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
