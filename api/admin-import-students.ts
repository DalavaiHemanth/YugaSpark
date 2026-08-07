import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, sendError } from "./_lib/auth.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";

const STUDENT_DEFAULT_PASSWORD = "yugaspark123";

type StudentImportItem = {
  email: string;
  full_name?: string | null;
  registration_number?: string | null;
  year?: string | null;
  batch?: string | null;
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

  try {
    const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
      _user_id: ctx.userId,
      _role: "admin",
    });
    if (!isAdmin) return sendError(res, "Forbidden: admins only", 403);

    const body = req.body as { students?: unknown };
    const students: StudentImportItem[] = (
      Array.isArray(body?.students) ? body.students : []
    )
      .map((s: Record<string, unknown>) => ({
        email: String(s.email ?? "")
          .trim()
          .toLowerCase(),
        full_name: s.full_name ? String(s.full_name).trim() : null,
        registration_number: s.registration_number
          ? String(s.registration_number).trim()
          : null,
        year: s.year ? String(s.year).trim() : null,
        batch: s.batch ? String(s.batch).trim() : null,
      }))
      .filter((s) => s.email.length > 0);

    const supabaseAdmin = getSupabaseAdmin();
    let created = 0;
    let updated = 0;
    const failed: string[] = [];

    for (const student of students) {
      let email = student.email;
      if (!email.includes("@")) email = `${email}@rgmcet.edu.in`;

      await supabaseAdmin.from("allowed_emails").upsert({ email }, { onConflict: "email" });

      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      let userId = existing?.id ?? null;

      if (!userId) {
        const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: STUDENT_DEFAULT_PASSWORD,
          email_confirm: true,
        });

        if (!error && authData?.user) {
          userId = authData.user.id;
          created += 1;
        } else if (error?.message.toLowerCase().includes("already")) {
          const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
          const found = userList?.users?.find(
            (u) => u.email?.toLowerCase() === email,
          );
          userId = found?.id ?? null;
          updated += 1;
        } else {
          failed.push(email);
          continue;
        }
      } else {
        updated += 1;
      }

      if (userId) {
        const updatePayload: Record<string, unknown> = {};
        if (student.full_name) updatePayload.full_name = student.full_name;
        if (student.registration_number)
          updatePayload.registration_number = student.registration_number;
        if (student.year) updatePayload.year = student.year;
        if (student.batch) updatePayload.batch = student.batch;
        updatePayload.profile_completed = true;

        await supabaseAdmin.from("profiles").update(updatePayload).eq("id", userId);
      }
    }

    await supabaseAdmin.rpc("write_audit", {
      _action: "bulk_import",
      _entity: "student",
      _entity_id: "",
      _summary: `Imported ${students.length} student profile(s) — ${created} created, ${updated} updated`,
      _details: { count: students.length, created, updated, failed },
      _actor: ctx.userId,
    });

    return res.status(200).json({ created, updated, failed });
  } catch (err) {
    console.error("[admin-import-students]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
