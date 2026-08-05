import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failure, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "register_for_hackathon",
  title: "Register for a hackathon",
  description: "Register the signed-in member for a hackathon, or withdraw an existing registration.",
  inputSchema: {
    hackathon_id: z.string().describe("The hackathon id from list_hackathons."),
    withdraw: z.boolean().optional().describe("Set true to withdraw instead of register."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ hackathon_id, withdraw }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    if (withdraw) {
      const { error } = await supabase
        .from("registrations")
        .delete()
        .eq("user_id", userId)
        .eq("hackathon_id", hackathon_id);
      return error ? failure(error.message) : ok({ status: "withdrawn", hackathon_id });
    }
    const { error } = await supabase
      .from("registrations")
      .insert({ user_id: userId, hackathon_id });
    return error ? failure(error.message) : ok({ status: "registered", hackathon_id });
  },
});
