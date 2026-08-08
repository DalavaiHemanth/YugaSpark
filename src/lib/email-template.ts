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

export function formatBodyToHtml(text: string): string {
  let escaped = escapeHtml(text);

  // Bold: **text** or __text__
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/__(.*?)__/g, "<strong>$1</strong>");

  // Italics: *text* or _text_
  escaped = escaped.replace(/\*(.*?)\*/g, "<em>$1</em>");
  escaped = escaped.replace(/_(.*?)_/g, "<em>$1</em>");

  // Markdown links: [text](url)
  escaped = escaped.replace(
    /\[(.*?)\]\((https?:\/\/.*?)\)/g,
    '<a href="$2" target="_blank" style="color:#e2603a;text-decoration:underline;">$1</a>'
  );

  // Headers: ## Header or ### Header
  escaped = escaped.replace(
    /^### (.*$)/gim,
    '<h3 style="margin:16px 0 8px;font-size:16px;color:#111827;">$1</h3>'
  );
  escaped = escaped.replace(
    /^## (.*$)/gim,
    '<h2 style="margin:20px 0 10px;font-size:18px;color:#111827;border-bottom:1px solid #eee;padding-bottom:4px;">$1</h2>'
  );

  // Bullet points: - Item or * Item
  escaped = escaped.replace(/^[\-\*] (.*$)/gim, '<li style="margin-bottom:4px;">$1</li>');
  escaped = escaped.replace(
    /(<li.*<\/li>\n?)+/g,
    '<ul style="margin:8px 0 16px;padding-left:20px;line-height:1.6;">$&</ul>'
  );

  // Paragraphs
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((p) => {
      if (p.startsWith("<h2") || p.startsWith("<h3") || p.startsWith("<ul")) return p;
      return `<p style="margin:0 0 16px;line-height:1.6;">${p.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");

  return paragraphs;
}

export function renderHtml(
  subject: string,
  body: string,
  options?: { bannerUrl?: string | null }
) {
  const contentHtml = formatBodyToHtml(body);
  const bannerHtml = options?.bannerUrl
    ? `<div style="overflow:hidden;border-radius:12px 12px 0 0;margin:-28px -28px 24px -28px;">
        <img src="${escapeHtml(options.bannerUrl)}" alt="Banner" style="width:100%;max-height:240px;object-fit:cover;display:block;" />
       </div>`
    : "";

  return `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1a1c1f;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:#ffffff;border-radius:14px;padding:28px;border:1px solid #e6e8ec;">
      ${bannerHtml}
      <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#e2603a;font-weight:700;">Yuga Spark</div>
      <h1 style="margin:8px 0 20px;font-size:20px;line-height:1.3;color:#111827;">${escapeHtml(subject)}</h1>
      <div style="font-size:15px;color:#31353b;">${contentHtml}</div>
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