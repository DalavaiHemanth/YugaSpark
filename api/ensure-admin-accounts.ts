import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";

const ADMIN_EMAILS = ["jayakrushna1622@gmail.com", "hemanthleads@gmail.com"];
const ADMIN_DEFAULT_PASSWORD = "cat@1234";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    for (const email of ADMIN_EMAILS) {
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      let userId = existing?.id ?? null;

      if (!userId) {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: ADMIN_DEFAULT_PASSWORD,
          email_confirm: true,
        });
        if (error && !error.message.toLowerCase().includes("already")) continue;
        userId = data?.user?.id ?? null;
      }

      if (!userId) continue;

      await supabaseAdmin.from("user_roles").upsert(
        { user_id: userId, role: "super_admin" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[ensure-admin-accounts]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
