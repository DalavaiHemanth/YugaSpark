import { defineTool } from "@lovable.dev/mcp-js";
import { failure, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_notices",
  title: "Notice board",
  description: "Club announcements, outside hackathons, links and polls from the notice board.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("notices")
      .select("id,kind,title,body,link,options,expires_at,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    return error ? failure(error.message) : ok({ notices: data });
  },
});
