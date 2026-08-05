import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failure, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_playbook_resources",
  title: "Playbook resources",
  description: "Learning resources from the Yuga Spark playbook, optionally filtered by category.",
  inputSchema: { category: z.string().optional().describe("Category to filter by.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("resources")
      .select("id,title,description,url,category,created_at")
      .order("created_at", { ascending: false });
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    return error ? failure(error.message) : ok({ resources: data });
  },
});
