import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failure, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_hackathons",
  title: "List hackathons",
  description: "List Yuga Spark hackathons with dates, venue, mode, team sizes and registration state.",
  inputSchema: {
    upcoming_only: z.boolean().optional().describe("Only events on or after today. Defaults to true."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ upcoming_only }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("hackathons")
      .select("id,title,description,venue,event_date,start_time,end_time,mode,team_min,team_max,registration_open,registration_deadline")
      .order("event_date", { ascending: true });
    if (upcoming_only !== false) {
      query = query.gte("event_date", new Date().toISOString().slice(0, 10));
    }
    const { data, error } = await query;
    return error ? failure(error.message) : ok({ hackathons: data });
  },
});
