import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Send, Inbox, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const TEMPLATES: { label: string; body: string }[] = [
  {
    label: "Registration open",
    body: "Registrations are open on the Hackathons page in your dashboard. Hit Register before the deadline shown on the event card.",
  },
  {
    label: "Team size",
    body: "Team size for this event is fixed by the organisers — check the min/max shown on the hackathon card. Use Squad Finder to form or join a team.",
  },
  {
    label: "Certificate",
    body: "Certificates are released after we upload results. Once marked attended, download yours from the Certificates section of your dashboard.",
  },
  {
    label: "Profile issue",
    body: "Please open Profile and make sure full name, registration number, year, personal mail and photo are filled in. Ping us here if it still blocks you.",
  },
  {
    label: "We're on it",
    body: "Thanks for reaching out! We've noted this and will get back to you with an update shortly.",
  },
];

export function InboxPanel() {
  const { user } = useAuth();
  const [active, setActive] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const messages = useQuery({
    queryKey: ["admin-messages"],
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const members = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,full_name,email");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const list = messages.data ?? [];
  const threads = Array.from(new Set(list.map((m) => m.student_id)));
  const current = active ?? threads[0] ?? null;
  const nameOf = (id: string) => {
    const m = members.data?.find((x) => x.id === id);
    return m?.full_name ?? m?.email ?? "Member";
  };

  async function send() {
    const body = reply.trim();
    if (!user || !body) return;
    const targets = selected.length > 0 ? selected : current ? [current] : [];
    if (targets.length === 0) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert(
      targets.map((student_id) => ({
        student_id,
        sender_id: user.id,
        from_admin: true,
        body,
      })),
    );
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      targets.length > 1 ? `Reply sent to ${targets.length} students` : "Reply sent",
    );
    setReply("");
    setSelected([]);
    void messages.refetch();
  }

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="surface h-fit max-h-64 overflow-y-auto lg:max-h-none lg:overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-3">
          <h3 className="font-display text-sm font-bold">Threads</h3>
          <div className="flex items-center gap-2">
            {threads.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  setSelected((s) => (s.length === threads.length ? [] : threads))
                }
                className="text-[11px] font-medium text-primary hover:underline"
              >
                {selected.length === threads.length ? "Clear" : "Select all"}
              </button>
            ) : null}
            <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              {threads.length}
            </span>
          </div>
        </div>
        {threads.length === 0 ? (
          <div className="p-5 text-center">
            <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <Inbox className="h-4 w-4" />
            </span>
            <p className="mt-3 font-display text-sm font-bold">Inbox is clear</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Student doubts land here. Post a notice inviting questions to get the first one.
            </p>
          </div>
        ) : (
          threads.map((t) => (
            <div
              key={t}
              className={`flex w-full items-center gap-2.5 border-b border-border px-4 py-3 text-left text-sm last:border-0 transition-colors ${
                current === t ? "bg-primary/10 font-medium text-foreground" : "hover:bg-secondary/60"
              }`}
            >
              <Checkbox
                checked={selected.includes(t)}
                onCheckedChange={() => toggle(t)}
                aria-label={`Select ${nameOf(t)} for bulk reply`}
              />
              <button
                type="button"
                onClick={() => setActive(t)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-[10px] font-semibold text-primary">
                  {nameOf(t).slice(0, 2).toUpperCase()}
                </span>
                <span className="truncate">{nameOf(t)}</span>
              </button>
            </div>
          ))
        )}
      </div>

      <div className="surface flex h-[440px] flex-col overflow-hidden sm:h-[520px]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/30 px-4 py-3 sm:px-5">
          <h3 className="font-display text-sm font-bold">
            {current ? nameOf(current) : "No conversation selected"}
          </h3>
          {selected.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              <Users className="h-3 w-3" />
              Bulk reply to {selected.length}
            </span>
          ) : null}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {current
            ? list
                .filter((m) => m.student_id === current)
                .map((m) => (
                  <div key={m.id} className={`flex ${m.from_admin ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.from_admin
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className="mt-1 text-[10px] opacity-70">
                        {new Date(m.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
            : null}
        </div>
        <div className="space-y-2.5 border-t border-border p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 pr-1 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Templates
            </span>
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => setReply(t.body)}
                className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-[11px] font-medium transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <Textarea
              rows={2}
              value={reply}
              placeholder={
                selected.length > 0
                  ? `Reply to ${selected.length} selected students…`
                  : "Reply to this student…"
              }
              onChange={(e) => setReply(e.target.value)}
            />
            <Button
              size="icon"
              onClick={send}
              disabled={!reply.trim() || sending || (selected.length === 0 && !current)}
              aria-label={selected.length > 0 ? "Send bulk reply" : "Send reply"}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
