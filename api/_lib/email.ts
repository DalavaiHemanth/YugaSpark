/**
 * Self-contained email sender for Vercel API routes.
 * Copies necessary logic from src/lib/email-template.ts and src/lib/email.server.ts
 * without relying on @/ path aliases (which don't resolve outside src/).
 */
import nodemailer from "nodemailer";
import { getSupabaseAdmin } from "./supabase-admin.js";

export type Recipient = { email: string; name?: string | null };

export type SendOutcome = {
  email: string;
  name: string | null;
  status: "sent" | "failed";
  error: string | null;
  providerId: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

async function getSmtpConfig() {
  const host = process.env["SMTP_HOST"] || "smtp.gmail.com";
  const port = Number(process.env["SMTP_PORT"] || "587");
  const secure = process.env["SMTP_SECURE"] === "true" || port === 465;

  let user = process.env["SMTP_USER"] || process.env["GMAIL_USER"] || "";
  let pass = process.env["SMTP_PASS"] || process.env["GMAIL_APP_PASSWORD"] || "";
  let from = process.env["SMTP_FROM"] || (user ? `Yuga Spark <${user}>` : "");

  // Fallback to app_settings table
  if (!user || !pass) {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data: settings } = await supabaseAdmin
        .from("app_settings")
        .select("key, value")
        .in("key", ["smtp_user", "smtp_pass", "smtp_from", "smtp_host", "smtp_port"]);

      const map = new Map(settings?.map((s) => [s.key, s.value]) ?? []);
      if (!user) user = (map.get("smtp_user") as string) || "";
      if (!pass) pass = (map.get("smtp_pass") as string) || "";
      if (!from)
        from =
          (map.get("smtp_from") as string) || (user ? `Yuga Spark <${user}>` : "");
    } catch {
      // ignore
    }
  }

  return { host, port, secure, user, pass, from };
}

export type SendAttachment = {
  filename: string;
  content: string; // base64 string
  contentType?: string;
};

export async function sendBatch(args: {
  from?: string;
  replyTo?: string | null;
  subject: string;
  body: string;
  bannerUrl?: string | null;
  attachments?: SendAttachment[];
  recipients: Recipient[];
}): Promise<SendOutcome[]> {
  const config = await getSmtpConfig();

  if (!config.user || !config.pass) {
    const errorMsg =
      "SMTP credentials not configured. Please set SMTP_USER & SMTP_PASS in env or Admin Settings.";
    return args.recipients.map((r) => ({
      email: r.email,
      name: r.name ?? null,
      status: "failed" as const,
      error: errorMsg,
      providerId: null,
    }));
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  const fromAddress = args.from || config.from || config.user;
  const outcomes: SendOutcome[] = [];

  const parsedAttachments = (args.attachments ?? []).map((att) => ({
    filename: att.filename,
    content: Buffer.from(att.content, "base64"),
    contentType: att.contentType,
  }));

  for (const r of args.recipients) {
    const subject = personalize(args.subject, r);
    const text = personalize(args.body, r);
    const html = renderHtml(subject, text, { bannerUrl: args.bannerUrl });

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: r.email,
        replyTo: args.replyTo || undefined,
        subject,
        text,
        html,
        attachments: parsedAttachments.length > 0 ? parsedAttachments : undefined,
      });
      outcomes.push({
        email: r.email,
        name: r.name ?? null,
        status: "sent",
        error: null,
        providerId: (info as { messageId?: string }).messageId || null,
      });
    } catch (err) {
      outcomes.push({
        email: r.email,
        name: r.name ?? null,
        status: "failed",
        error: err instanceof Error ? err.message : "Failed to send",
        providerId: null,
      });
    }
  }

  return outcomes;
}
