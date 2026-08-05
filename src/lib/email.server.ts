/** Server-only email delivery through the Resend connector gateway. */
import { personalize, renderHtml, type Recipient } from "./email-template";

const RESEND_API_URL = "https://api.resend.com";

export type { Recipient };
export { personalize, renderHtml };

export type SendOutcome = {
  email: string;
  name: string | null;
  status: "sent" | "failed";
  error: string | null;
  providerId: string | null;
};

type BatchItem = {
  from: string;
  to: string[];
  reply_to?: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Sends one email per recipient via Resend's batch endpoint (max 100 per call).
 * Returns one outcome per recipient, in the same order.
 */
export async function sendBatch(args: {
  from: string;
  replyTo?: string | null;
  subject: string;
  body: string;
  recipients: Recipient[];
}): Promise<SendOutcome[]> {
  const resendKey = process.env["RESEND_API_KEY"];
  if (!resendKey) {
    return args.recipients.map((r) => ({
      email: r.email,
      name: r.name ?? null,
      status: "failed" as const,
      error: "Email service is not configured",
      providerId: null,
    }));
  }

  const outcomes: SendOutcome[] = [];
  for (let i = 0; i < args.recipients.length; i += 100) {
    const chunk = args.recipients.slice(i, i + 100);
    const payload: BatchItem[] = chunk.map((r) => {
      const subject = personalize(args.subject, r);
      const text = personalize(args.body, r);
      return {
        from: args.from,
        to: [r.email],
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
        subject,
        text,
        html: renderHtml(subject, text),
      };
    });

    let response: Response;
    try {
      response = await fetch(`${RESEND_API_URL}/emails/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      outcomes.push(
        ...chunk.map((r) => ({
          email: r.email,
          name: r.name ?? null,
          status: "failed" as const,
          error: message,
          providerId: null,
        })),
      );
      continue;
    }

    const raw = await response.text();
    if (!response.ok) {
      console.error(`Resend batch failed [${response.status}]: ${raw}`);
      outcomes.push(
        ...chunk.map((r) => ({
          email: r.email,
          name: r.name ?? null,
          status: "failed" as const,
          error: `[${response.status}] ${raw.slice(0, 300)}`,
          providerId: null,
        })),
      );
      continue;
    }

    let ids: (string | null)[] = [];
    try {
      const parsed = JSON.parse(raw) as { data?: { id?: string }[] };
      ids = (parsed.data ?? []).map((d) => d.id ?? null);
    } catch {
      ids = [];
    }
    outcomes.push(
      ...chunk.map((r, idx) => ({
        email: r.email,
        name: r.name ?? null,
        status: "sent" as const,
        error: null,
        providerId: ids[idx] ?? null,
      })),
    );
  }
  return outcomes;
}