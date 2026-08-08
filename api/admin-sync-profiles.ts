import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, sendError } from "./_lib/auth.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";

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

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch existing profile IDs to avoid redundant upserts
    const { data: existingProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id");
    const existingSet = new Set((existingProfiles ?? []).map((p) => p.id));

    let page = 1;
    let hasMore = true;
    let synced = 0;
    let totalAuthUsers = 0;

    while (hasMore) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (authError || !authData?.users) break;

      totalAuthUsers += authData.users.length;
      for (const u of authData.users) {
        if (!u.email) continue;
        if (!existingSet.has(u.id)) {
          await supabaseAdmin.from("profiles").upsert(
            {
              id: u.id,
              email: u.email.toLowerCase(),
              profile_completed: false,
              is_active: true,
            },
            { onConflict: "id" }
          );
          await supabaseAdmin.from("user_roles").upsert(
            { user_id: u.id, role: "student" },
            { onConflict: "user_id,role", ignoreDuplicates: true }
          );
          synced++;
        }
      }

      if (authData.users.length < 1000) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return res.status(200).json({ ok: true, synced, totalAuthUsers });
  } catch (err) {
    console.error("[admin-sync-profiles]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
