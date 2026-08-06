import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAILS = ["jayakrushna1622@gmail.com", "hemanthleads@gmail.com"];
const ADMIN_DEFAULT_PASSWORD = "cat@1234";
export const STUDENT_DEFAULT_PASSWORD = "yugaspark123";

/** Creates the two fixed club admin accounts once. Never touches existing passwords. */
export const ensureAdminAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
  return { ok: true };
});

/** Allows Super Admins to promote or demote Admin roles. */
export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { userId: string; role: "admin" | "super_admin"; action: "add" | "remove" }) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: leadProfile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();

    const isLead = Boolean(leadProfile?.email && ADMIN_EMAILS.includes(leadProfile.email.toLowerCase()));

    const { data: superRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!isLead && !superRole) {
      throw new Error("Only Super Admins can manage Admin roles.");
    }

    if (data.action === "add") {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: data.userId, role: data.role },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    } else {
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", data.userId)
        .maybeSingle();
      if (targetProfile?.email && ADMIN_EMAILS.includes(targetProfile.email.toLowerCase())) {
        throw new Error("Permanent Super Admins cannot be demoted.");
      }

      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
    }

    return { ok: true };
  });

/** Tells the sign-up screen whether this email may create an account. */
export const canSignUp = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => ({ email: String(data.email).trim().toLowerCase() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: setting } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "access_mode")
      .maybeSingle();
    if ((setting?.value ?? "open") === "open") return { allowed: true };
    if (ADMIN_EMAILS.includes(data.email)) return { allowed: true };
    const { data: allowed } = await supabaseAdmin
      .from("allowed_emails")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();
    return { allowed: Boolean(allowed) };
  });

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const client = context.supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  const { data } = await client.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden: admins only");
}

/** Admin: create student accounts from a list of emails. */
export const adminCreateStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { emails: string[] }) => ({
    emails: (data.emails ?? []).map((e) => String(e).trim().toLowerCase()).filter(Boolean),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let created = 0;
    let existed = 0;
    const failed: string[] = [];
    for (const email of data.emails) {
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
      _summary: `Invited ${data.emails.length} student account(s) — ${created} created, ${existed} already existed`,
      _details: { emails: data.emails, created, existed, failed },
      _actor: context.userId,
    });
    return { created, existed, failed };
  });

/** Admin: set another member's password. */
export const adminSetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { userId: string; password: string }) => {
    const password = String(data.password);
    if (password.length < 6) throw new Error("Password must be at least 6 characters");
    return { userId: String(data.userId), password };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .maybeSingle();
    await supabaseAdmin.rpc("write_audit", {
      _action: "password_reset",
      _entity: "student",
      _entity_id: data.userId,
      _summary: `Password changed for ${target?.email ?? data.userId}`,
      _details: { self: data.userId === context.userId },
      _actor: context.userId,
    });
    return { ok: true };
  });

/** Admin: remove a member entirely. */
export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { userId: string }) => ({ userId: String(data.userId) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot delete your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .maybeSingle();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.rpc("write_audit", {
      _action: "delete",
      _entity: "student",
      _entity_id: data.userId,
      _summary: `Account removed: ${target?.email ?? data.userId}`,
      _details: {},
      _actor: context.userId,
    });
    return { ok: true };
  });