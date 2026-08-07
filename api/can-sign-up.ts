import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { checkRateLimit, LIMITS } from "./_lib/rate-limit.js";

const ADMIN_EMAILS = ["jayakrushna1622@gmail.com", "hemanthleads@gmail.com"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limit by IP (public route — no auth available)
  const ip = String(req.headers["x-forwarded-for"] ?? req.socket?.remoteAddress ?? "unknown");
  const rl = checkRateLimit(ip, { route: "can-sign-up", ...LIMITS["can-sign-up"] });
  if (!rl.allowed) {
    return res.status(429).json({ error: "Too many requests. Try again later." });
  }

  try {
    const body = req.body as { email?: unknown };
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: setting } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "access_mode")
      .maybeSingle();

    if ((setting?.value ?? "open") === "open") {
      return res.status(200).json({ allowed: true });
    }

    if (ADMIN_EMAILS.includes(email)) {
      return res.status(200).json({ allowed: true });
    }

    const { data: allowed } = await supabaseAdmin
      .from("allowed_emails")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    return res.status(200).json({ allowed: Boolean(allowed) });
  } catch (err) {
    console.error("[can-sign-up]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
