import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendClubEmail } from "@/lib/email.functions";
import { SenderSettings } from "@/components/admin/SenderSettings";
import { TemplatePreview } from "@/components/admin/TemplatePreview";
import type { EmailTemplate } from "@/lib/email-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

type Audience = "all" | "complete" | "pending" | "hackathon";

export function MailPanel() {
  const queryClient = useQueryClient();
  const send = useServerFn(sendClubEmail);
  const [sending, setSending] = useState(false);
  const [audience, setAudience] = useState<Audience>("all");
  const [hid, setHid] = useState("");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [usePersonal, setUsePersonal] = useState(false);
  const [kind, setKind] = useState<"broadcast" | "announcement" | "results">("broadcast");

  const members = useQuery({
    queryKey: ["mail-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,personal_email,full_name,profile_completed,is_active")
        .order("full_name");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const hackathons = useQuery({
    queryKey: ["mail-hackathons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hackathons")
        .select("id,title,event_date")
        .order("event_date", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const registrations = useQuery({
    queryKey: ["mail-regs", hid],
    enabled: audience === "hackathon" && Boolean(hid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("user_id")
        .eq("hackathon_id", hid);
      if (error) throw new Error(error.message);
      return data.map((r) => r.user_id);
    },
  });

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (members.data ?? []).filter((m) => {
      if (audience === "complete" && !m.profile_completed) return false;
      if (audience === "pending" && m.profile_completed) return false;
      if (audience === "hackathon" && !(registrations.data ?? []).includes(m.id)) return false;
      if (!term) return true;
      return [m.email, m.full_name, m.personal_email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [members.data, registrations.data, audience, q]);

  const selected = visible.filter((m) => picked[m.id]);
  const targets = (selected.length ? selected : visible)
    .map((m) => ({
      email: (usePersonal && m.personal_email ? m.personal_email : m.email) ?? "",
      name: m.full_name,
    }))
    .filter((t) => Boolean(t.email));
  const recipients = targets.map((t) => t.email);

  const settings = useQuery({
    queryKey: ["email-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", ["email_from_name", "email_from_address", "email_reply_to"]);
      if (error) throw new Error(error.message);
      return Object.fromEntries(data.map((s) => [s.key, s.value])) as Record<string, string>;
    },
  });
  const fromAddress = settings.data?.["email_from_address"] ?? "";

  async function sendNow() {
    if (!fromAddress) {
      toast.error("Set a verified sender address first");
      return;
    }
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (trimmedSubject.length < 3 || trimmedSubject.length > 200) {
      toast.error("Subject must be 3–200 characters");
      return;
    }
    if (trimmedBody.length < 5 || trimmedBody.length > 20000) {
      toast.error("Message must be 5–20000 characters");
      return;
    }
    if (targets.length === 0) {
      toast.error("No recipients");
      return;
    }
    setSending(true);
    try {
      const result = await send({
        data: { subject: trimmedSubject, body: trimmedBody, kind, recipients: targets },
      });
      if (result.failed > 0) {
        toast.error(`${result.sent} sent, ${result.failed} failed. ${result.firstError ?? ""}`);
      } else {
        toast.success(`Delivered to ${result.sent} member(s)`);
      }
      void queryClient.invalidateQueries({ queryKey: ["email-logs"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  // Mail apps silently drop very long mailto links, so send in batches.
  const BATCH_SIZE = 40;
  const batches = useMemo(() => {
    const out: string[][] = [];
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      out.push(recipients.slice(i, i + BATCH_SIZE));
    }
    return out;
  }, [recipients]);

  function openBatch(index: number) {
    const batch = batches[index];
    if (!batch) {
      toast.error("No recipients");
      return;
    }
    const url = `mailto:?bcc=${encodeURIComponent(batch.join(","))}&subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  async function copyList() {
    if (recipients.length === 0) return;
    await navigator.clipboard.writeText(recipients.join(", "));
    toast.success(`${recipients.length} address(es) copied`);
  }

  return (
    <div className="space-y-6">
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="surface">
        <div className="space-y-3 border-b border-border px-4 py-4 sm:px-5">
          <h2 className="label-mono text-muted-foreground">Audience</h2>
          <div className="flex flex-wrap gap-2">
            {(["all", "complete", "pending", "hackathon"] as const).map((a) => (
              <Button
                key={a}
                size="sm"
                variant={audience === a ? "default" : "outline"}
                className="capitalize"
                onClick={() => {
                  setAudience(a);
                  setPicked({});
                }}
              >
                {a === "hackathon" ? "By hackathon" : a}
              </Button>
            ))}
          </div>
          {audience === "hackathon" ? (
            <select
              value={hid}
              onChange={(e) => setHid(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select a hackathon…</option>
              {(hackathons.data ?? []).map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title} · {new Date(h.event_date).toLocaleDateString()}
                </option>
              ))}
            </select>
          ) : null}
          <Input value={q} placeholder="Search members…" onChange={(e) => setQ(e.target.value)} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {selected.length ? `${selected.length} selected` : `${visible.length} in this list`}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setPicked(Object.fromEntries(visible.map((m) => [m.id, true])))
                }
              >
                Select all
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPicked({})}>
                Clear
              </Button>
            </div>
          </div>
        </div>
        <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
          {visible.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Checkbox
                checked={Boolean(picked[m.id])}
                onCheckedChange={(v) => setPicked({ ...picked, [m.id]: Boolean(v) })}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.full_name ?? "Unnamed member"}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {usePersonal && m.personal_email ? m.personal_email : m.email}
                </p>
              </div>
            </li>
          ))}
          {visible.length === 0 ? (
            <li className="px-5 py-6 text-sm text-muted-foreground">Nobody matches this filter.</li>
          ) : null}
        </ul>
      </div>

      <div className="space-y-4 surface p-4 sm:p-6">
        <h2 className="label-mono text-muted-foreground">Compose</h2>
        <p className="text-xs text-muted-foreground">
          Opens your mail app with everyone on BCC — send individually by picking one member, or in
          bulk by selecting many (or none, to mail the whole filtered list).
        </p>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={usePersonal}
            onCheckedChange={(v) => setUsePersonal(Boolean(v))}
          />
          Prefer personal email when available
        </label>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">Message</Label>
          <Textarea id="body" rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Use <code>{"{{name}}"}</code> or <code>{"{{first_name}}"}</code> to personalise each email.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={sendNow} disabled={sending || !fromAddress}>
              {sending ? "Sending…" : `Send now (${recipients.length})`}
            </Button>
            {fromAddress ? (
              <span className="text-xs text-muted-foreground">from {fromAddress}</span>
            ) : (
              <span className="text-xs text-destructive">
                Add a verified sender below before sending.
              </span>
            )}
          </div>
          <SenderSettings />
          <p className="text-xs text-muted-foreground">
            Prefer your own mail app? Use the batch links below instead.
          </p>
          <div className="flex flex-wrap gap-2">
            {batches.length <= 1 ? (
              <Button onClick={() => openBatch(0)}>Open mail app ({recipients.length})</Button>
            ) : (
              batches.map((batch, i) => (
                <Button key={i} variant={i === 0 ? "default" : "outline"} onClick={() => openBatch(i)}>
                  Batch {i + 1} ({batch.length})
                </Button>
              ))
            )}
            <Button variant="outline" onClick={copyList}>
              Copy addresses
            </Button>
          </div>
          {batches.length > 1 ? (
            <p className="text-xs text-muted-foreground">
              {recipients.length} recipients split into {batches.length} batches of up to 40 — mail
              apps drop very long BCC lists. Open and send each batch in turn.
            </p>
          ) : null}
        </div>
      </div>
    </div>

      <TemplatePreview
        subject={subject}
        body={body}
        sample={targets[0] ?? null}
        onApplyTemplate={(t: EmailTemplate) => {
          setSubject(t.subject);
          setBody(t.body);
          setKind(t.kind);
        }}
        onReplaceContent={({ subject: s, body: b }) => {
          setSubject(s);
          setBody(b);
        }}
      />
    </div>
  );
}
