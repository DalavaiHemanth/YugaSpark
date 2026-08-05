/** Browser-safe email rendering shared by the server sender and the admin preview. */

export type Recipient = { email: string; name?: string | null };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Replaces {{name}} / {{first_name}} / {{email}} placeholders with the recipient's own values. */
export function personalize(text: string, r: Recipient) {
  const first = (r.name ?? "").trim().split(" ")[0] || "there";
  return text
    .replace(/\{\{\s*name\s*\}\}/gi, (r.name ?? "").trim() || "there")
    .replace(/\{\{\s*first_name\s*\}\}/gi, first)
    .replace(/\{\{\s*email\s*\}\}/gi, r.email);
}

export function renderHtml(subject: string, body: string) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1a1c1f;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:#ffffff;border-radius:14px;padding:28px;border:1px solid #e6e8ec;">
      <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#e2603a;font-weight:700;">Yuga Spark</div>
      <h1 style="margin:8px 0 20px;font-size:20px;line-height:1.3;">${escapeHtml(subject)}</h1>
      <div style="font-size:15px;color:#31353b;">${paragraphs}</div>
    </div>
    <p style="margin:18px 0 0;font-size:12px;color:#8b9099;text-align:center;">
      Yuga Spark — the hackathon club. You receive this because you are a club member.
    </p>
  </div>
</body></html>`;
}

export const EMAIL_VARIABLES = [
  { token: "{{name}}", label: "Full name" },
  { token: "{{first_name}}", label: "First name" },
  { token: "{{email}}", label: "Email address" },
] as const;

export type EmailTemplate = {
  id: string;
  label: string;
  kind: "announcement" | "results" | "broadcast";
  subject: string;
  body: string;
};

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "announcement",
    label: "Hackathon announcement",
    kind: "announcement",
    subject: "New hackathon: {{hackathon}}",
    body: `Hi {{first_name}},

A new hackathon is open for registration — {{hackathon}}.

Date: {{date}}
Venue: {{venue}}
Team size: {{team_size}}

Register from your Yuga Spark dashboard before the deadline. Spots are limited.

— Yuga Spark`,
  },
  {
    id: "results",
    label: "Results announcement",
    kind: "results",
    subject: "Results out: {{hackathon}}",
    body: `Hi {{first_name}},

Results for {{hackathon}} are live. Placements and points are on the leaderboard, and attendees can download their certificates from the Certificates page.

Thanks for building with us.

— Yuga Spark`,
  },
  {
    id: "reminder",
    label: "Deadline reminder",
    kind: "broadcast",
    subject: "Last call: {{hackathon}} registration closes soon",
    body: `Hi {{first_name}},

Registration for {{hackathon}} closes on {{date}}. If you still need a team, use Squad Finder on your dashboard.

— Yuga Spark`,
  },
];