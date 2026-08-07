import { createClient } from "@supabase/supabase-js";
import type { VercelRequest } from "@vercel/node";

export type AuthContext = {
  supabase: ReturnType<typeof createClient>;
  userId: string;
};

/** Extracts the Bearer token from the request, validates it with Supabase, and returns the auth context. */
export async function requireAuth(req: VercelRequest): Promise<AuthContext> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw Object.assign(new Error("Server misconfiguration: missing Supabase env vars"), {
      status: 500,
    });
  }

  const authHeader = req.headers["authorization"];
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

  if (!token || token.split(".").length !== 3) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw Object.assign(new Error("Unauthorized: invalid token"), { status: 401 });
  }

  return { supabase, userId: data.user.id };
}

/** Sends a JSON error response and returns false so you can early-exit. */
export function sendError(
  res: import("@vercel/node").VercelResponse,
  message: string,
  status = 400,
): void {
  res.status(status).json({ error: message });
}
