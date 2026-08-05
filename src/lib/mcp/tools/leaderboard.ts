import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failure, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "leaderboard",
  title: "Club leaderboard",
  description: "Club leaderboard with points, wins and events attended. Optionally scoped to one hackathon.",
  inputSchema: {
    hackathon_id: z.string().optional().describe("Scope the ranking to a single hackathon."),
    limit: z.number().int().optional().describe("How many rows to return. Defaults to 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ hackathon_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc("get_leaderboard", {
      _hackathon_id: hackathon_id ?? null,
    });
    if (error) return failure(error.message);
    const rows = Array.isArray(data) ? data.slice(0, Math.max(1, Math.min(limit ?? 20, 100))) : [];
    return ok({ leaderboard: rows });
  },
});
