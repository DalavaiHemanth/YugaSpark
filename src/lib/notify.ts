import { supabase } from "@/integrations/supabase/client";
import { sendClubEmail } from "@/lib/email.functions";

/**
 * In-app notifications. Every member sees these on the notice board.
 * Used while the club has no verified email sending domain.
 */

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export async function announceHackathon(
  h: {
    title: string;
    event_date: string;
    venue: string | null;
    start_time: string | null;
    team_min: number;
    team_max: number;
    mode: string;
    registration_deadline: string | null;
  },
  createdBy: string,
) {
  const lines = [
    `${fmtDate(h.event_date)}${h.start_time ? ` at ${h.start_time.slice(0, 5)}` : ""}.`,
    h.venue ? `Venue: ${h.venue} (${h.mode}).` : `Mode: ${h.mode}.`,
    `Teams of ${h.team_min}–${h.team_max}.`,
    h.registration_deadline
      ? `Register before ${new Date(h.registration_deadline).toLocaleString()}.`
      : "Register from your dashboard.",
  ];
  const { error } = await supabase.from("notices").insert({
    kind: "announcement",
    title: `New hackathon: ${h.title}`,
    body: lines.join(" "),
    created_by: createdBy,
  });
  return error?.message ?? null;
}

export async function announceResults(title: string, createdBy: string) {
  const { error } = await supabase.from("notices").insert({
    kind: "announcement",
    title: `Results out: ${title}`,
    body: "Placements and points are live on the leaderboard. Attendees can download certificates from the Certificates page.",
    created_by: createdBy,
  });
  return error?.message ?? null;
}

async function senderConfigured() {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "email_from_address")
    .maybeSingle();
  return Boolean(data?.value?.trim());
}

type MailResult = { sent: number; failed: number; skipped?: string } | null;

/** Emails every active member with a completed profile. Silently skips when no sender is set. */
export async function emailAllMembers(args: {
  subject: string;
  body: string;
  kind: "announcement" | "results";
  hackathonId?: string | null;
}): Promise<MailResult> {
  if (!(await senderConfigured())) return { sent: 0, failed: 0, skipped: "no_sender" };
  const { data, error } = await supabase
    .from("profiles")
    .select("email,full_name")
    .eq("is_active", true);
  if (error || !data?.length) return null;
  return sendClubEmail({
    data: {
      subject: args.subject,
      body: args.body,
      kind: args.kind,
      hackathonId: args.hackathonId ?? null,
      recipients: data.map((p) => ({ email: p.email, name: p.full_name })),
    },
  });
}

/** Emails only the members who attended a hackathon (results notification). */
export async function emailAttendees(hackathonId: string, subject: string, body: string): Promise<MailResult> {
  if (!(await senderConfigured())) return { sent: 0, failed: 0, skipped: "no_sender" };
  const { data, error } = await supabase
    .from("hackathon_results")
    .select("user_id, profiles:profiles!inner(email, full_name, is_active)")
    .eq("hackathon_id", hackathonId)
    .eq("attended", true);
  if (error || !data?.length) return null;
  const recipients = data
    .map((r) => r.profiles as unknown as { email: string; full_name: string | null; is_active: boolean })
    .filter((p) => p && p.is_active)
    .map((p) => ({ email: p.email, name: p.full_name }));
  if (recipients.length === 0) return null;
  return sendClubEmail({
    data: { subject, body, kind: "results", hackathonId, recipients },
  });
}