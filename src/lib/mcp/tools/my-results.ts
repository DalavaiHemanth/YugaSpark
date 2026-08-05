import { defineTool } from "@lovable.dev/mcp-js";
import { failure, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "my_results",
  title: "My hackathon results",
  description: "Attendance, placements and points earned by the signed-in member across hackathons.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("hackathon_results")
      .select("hackathon_id,attended,placement,points,hackathons(title,event_date)")
      .eq("user_id", ctx.getUserId());
    if (error) return failure(error.message);
    const total = (data ?? []).reduce((sum, r) => sum + (r.points ?? 0), 0);
    return ok({ results: data, total_points: total });
  },
});
