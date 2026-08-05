import { defineTool } from "@lovable.dev/mcp-js";
import { failure, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "my_registrations",
  title: "My registrations",
  description: "List the hackathons the signed-in member is registered for.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("registrations")
      .select("hackathon_id,created_at,hackathons(title,event_date,venue,mode)")
      .eq("user_id", ctx.getUserId());
    return error ? failure(error.message) : ok({ registrations: data });
  },
});
