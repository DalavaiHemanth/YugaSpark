/**
 * Client-side wrappers for club admin operations.
 * Formerly used @tanstack/react-start createServerFn — now plain fetch() calls to Vercel API routes.
 * The exported function signatures are identical so all call sites remain unchanged.
 */
import { supabase } from "@/integrations/supabase/client";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: "Request failed" }))) as {
      error?: string;
    };
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const STUDENT_DEFAULT_PASSWORD = "yugaspark123";

/** Creates the two fixed club admin accounts once. Never touches existing passwords. */
export async function ensureAdminAccounts(): Promise<{ ok: boolean }> {
  return post("/api/ensure-admin-accounts");
}

/** Allows Super Admins to promote or demote Admin roles. */
export async function adminSetRole(data: {
  userId: string;
  role: "admin" | "super_admin";
  action: "add" | "remove";
}): Promise<{ ok: boolean }> {
  return post("/api/admin-set-role", data);
}

/** Tells the sign-up screen whether this email may create an account. */
export async function canSignUp(opts: {
  data: { email: string };
}): Promise<{ allowed: boolean }> {
  return post("/api/can-sign-up", { email: opts.data.email });
}

/** Admin: create student accounts from a list of emails. */
export async function adminCreateStudents(opts: {
  data: { emails: string[] };
}): Promise<{ created: number; existed: number; failed: string[] }> {
  return post("/api/admin-create-students", { emails: opts.data.emails });
}

export type StudentImportItem = {
  email: string;
  full_name?: string | null;
  registration_number?: string | null;
  year?: string | null;
  batch?: string | null;
};

/** Admin: bulk import student accounts with mapped profile attributes. */
export async function adminImportStudentsWithProfiles(opts: {
  data: { students: StudentImportItem[] };
}): Promise<{ created: number; updated: number; failed: string[] }> {
  return post("/api/admin-import-students", { students: opts.data.students });
}

/** Admin: set another member's password. */
export async function adminSetPassword(opts: {
  data: { userId: string; password: string };
}): Promise<{ ok: boolean }> {
  return post("/api/admin-set-password", opts.data);
}

/** Admin: remove a member entirely. */
export async function adminDeleteUser(opts: {
  data: { userId: string };
}): Promise<{ ok: boolean }> {
  return post("/api/admin-delete-user", opts.data);
}

/** Admin: backfill/sync missing profiles for existing auth users. */
export async function adminSyncProfiles(): Promise<{ ok: boolean; synced: number; totalAuthUsers: number }> {
  return post("/api/admin-sync-profiles");
}