import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, sendError } from "./_lib/auth.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { checkRateLimit, LIMITS } from "./_lib/rate-limit.js";

const ADMIN_EMAILS = ["jayakrushna1622@gmail.com", "hemanthleads@gmail.com"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let ctx;
  try {
    ctx = await requireAuth(req);
  } catch (err: unknown) {
    const e = err as { message: string; status?: number };
    return sendError(res, e.message, e.status ?? 401);
  }

  // Rate limit: 20 role changes per minute per admin
  const rl = checkRateLimit(ctx.userId, { route: "admin-set-role", ...LIMITS["admin-set-role"] });
  if (!rl.allowed) {
    return res.status(429).json({ error: `Rate limit exceeded. Try again in ${Math.ceil(rl.resetMs / 1000)}s.` });
  }

  try {
    const body = req.body as {
      userId?: unknown;
      role?: unknown;
      action?: unknown;
    };
    const userId = String(body?.userId ?? "");
    const role = body?.role as "admin" | "super_admin";
    const action = body?.action as "add" | "remove";

    if (!userId || !role || !action) {
      return sendError(res, "userId, role, and action are required");
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Check caller is super_admin or permanent lead
    const { data: leadProfile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", ctx.userId)
      .maybeSingle();

    const isLead = Boolean(
      leadProfile?.email && ADMIN_EMAILS.includes(leadProfile.email.toLowerCase()),
    );

    const { data: superRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", ctx.userId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!isLead && !superRole) {
      return sendError(res, "Only Super Admins can manage Admin roles.", 403);
    }

    if (action === "add") {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
    } else {
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();

      if (
        targetProfile?.email &&
        ADMIN_EMAILS.includes(targetProfile.email.toLowerCase())
      ) {
        return sendError(res, "Permanent Super Admins cannot be demoted.", 403);
      }

      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[admin-set-role]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
