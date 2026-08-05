import { auth, defineMcp, type ToolDefinition } from "@lovable.dev/mcp-js";
import listHackathons from "./tools/list-hackathons";
import myRegistrations from "./tools/my-registrations";
import registerForHackathon from "./tools/register-for-hackathon";
import leaderboard from "./tools/leaderboard";
import myResults from "./tools/my-results";
import listNotices from "./tools/list-notices";
import listResources from "./tools/list-resources";
import messageAdmin from "./tools/message-admin";
import myProfile from "./tools/my-profile";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "yuga-spark-hub",
  title: "Yuga Spark Hub",
  version: "0.1.0",
  instructions:
    "Tools for the Yuga Spark hackathon club portal. Callers act as the signed-in club member: browse hackathons, register or withdraw, read the leaderboard, their own results, the notice board and playbook resources, and message the club admins.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listHackathons,
    myRegistrations,
    registerForHackathon,
    leaderboard,
    myResults,
    listNotices,
    listResources,
    messageAdmin,
    myProfile,
  ] as unknown as ToolDefinition<never, never>[],
});
