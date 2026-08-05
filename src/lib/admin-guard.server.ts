/** Shared server-side admin authorization check. */
type RoleCheck = {
  rpc: (
    fn: "has_role",
    args: { _user_id: string; _role: "admin" },
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export async function assertAdmin(supabase: unknown, userId: string) {
  const client = supabase as RoleCheck;
  const { data, error } = await client.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}
