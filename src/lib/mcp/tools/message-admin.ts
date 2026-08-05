import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failure, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "message_admin",
  title: "Message the club admins",
  description: "Send a doubt or question to the Yuga Spark admins from the signed-in member.",
  inputSchema: { body: z.string().describe("The message to send.") },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ body }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const text = body.trim();
    if (!text) return failure("Message cannot be empty.");
    if (text.length > 2000) return failure("Message is too long (max 2000 characters).");
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const { error } = await supabase
      .from("messages")
      .insert({ student_id: userId, sender_id: userId, from_admin: false, body: text });
    return error ? failure(error.message) : ok({ status: "sent" });
  },
});
