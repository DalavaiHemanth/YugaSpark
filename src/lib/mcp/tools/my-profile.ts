import { defineTool } from "@lovable.dev/mcp-js";
import { failure, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "my_profile",
  title: "My club profile",
  description: "The signed-in member's Yuga Spark profile: name, registration number, year and completion state.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,registration_number,year,personal_email,profile_completed,is_active")
      .eq("id", ctx.getUserId())
      .maybeSingle();
    return error ? failure(error.message) : ok({ profile: data });
  },
});
