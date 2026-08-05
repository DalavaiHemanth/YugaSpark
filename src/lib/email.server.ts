/** Server-only email delivery through Nodemailer (Google SMTP / standard SMTP). */
import nodemailer from "nodemailer";
import { personalize, renderHtml, type Recipient } from "./email-template";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type { Recipient };
export { personalize, renderHtml };

export type SendOutcome = {
  email: string;
  name: string | null;
  status: "sent" | "failed";
  error: string | null;
  providerId: string | null;
};

async function getSmtpConfig() {
  const host = process.env["SMTP_HOST"] || "smtp.gmail.com";
  const port = Number(process.env["SMTP_PORT"] || "587");
  const secure = process.env["SMTP_SECURE"] === "true" || port === 465;

  let user = process.env["SMTP_USER"] || process.env["GMAIL_USER"] || "";
  let pass = process.env["SMTP_PASS"] || process.env["GMAIL_APP_PASSWORD"] || "";
  let from = process.env["SMTP_FROM"] || (user ? `Yuga Spark <${user}>` : "");

  // If env vars are empty, fallback to app_settings table in Supabase
  if (!user || !pass) {
    try {
      const { data: settings } = await supabaseAdmin
        .from("app_settings")
        .select("key, value")
        .in("key", ["smtp_user", "smtp_pass", "smtp_from", "smtp_host", "smtp_port"]);

      const map = new Map(settings?.map((s) => [s.key, s.value]) ?? []);
      if (!user) user = map.get("smtp_user") || "";
      if (!pass) pass = map.get("smtp_pass") || "";
      if (!from) from = map.get("smtp_from") || (user ? `Yuga Spark <${user}>` : "");
    } catch {
      // ignore
    }
  }

  return { host, port, secure, user, pass, from };
}

/**
 * Creates a Nodemailer transporter instance using SMTP settings.
 */
export async function createTransporter() {
  const config = await getSmtpConfig();
  if (!config.user || !config.pass) {
    throw new Error("SMTP credentials not configured. Please set SMTP_USER & SMTP_PASS in .env or Admin Settings.");
  }
  return {
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    }),
    from: config.from || config.user,
  };
}

/**
 * Sends individual personalized emails to a list of recipients via SMTP.
 */
export async function sendBatch(args: {
  from?: string;
  replyTo?: string | null;
  subject: string;
  body: string;
  recipients: Recipient[];
}): Promise<SendOutcome[]> {
  let transportObj;
  try {
    transportObj = await createTransporter();
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "SMTP not configured";
    return args.recipients.map((r) => ({
      email: r.email,
      name: r.name ?? null,
      status: "failed" as const,
      error: errorMsg,
      providerId: null,
    }));
  }

  const { transporter, from: defaultFrom } = transportObj;
  const fromAddress = args.from || defaultFrom;
  const outcomes: SendOutcome[] = [];

  for (const r of args.recipients) {
    const subject = personalize(args.subject, r);
    const text = personalize(args.body, r);
    const html = renderHtml(subject, text);

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: r.email,
        replyTo: args.replyTo || undefined,
        subject,
        text,
        html,
      });

      outcomes.push({
        email: r.email,
        name: r.name ?? null,
        status: "sent",
        error: null,
        providerId: info.messageId || null,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to send email via SMTP";
      outcomes.push({
        email: r.email,
        name: r.name ?? null,
        status: "failed",
        error: errorMsg,
        providerId: null,
      });
    }
  }

  return outcomes;
}