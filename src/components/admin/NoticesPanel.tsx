import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { sendClubEmail } from "@/lib/email.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NoticesPanel() {
  const { user } = useAuth();
  const [sendEmailBroadcast, setSendEmailBroadcast] = useState(false);
  const [posting, setPosting] = useState(false);
  const [form, setForm] = useState({
    kind: "announcement",
    title: "",
    body: "",
    link: "",
    options: "",
    expires_at: "",
  });

  const notices = useQuery({
    queryKey: ["notices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    const options = form.kind === "poll"
      ? form.options.split("\n").map((o) => o.trim()).filter(Boolean)
      : [];
    
    try {
      const { error } = await supabase.from("notices").insert({
        kind: form.kind,
        title: form.title.trim(),
        body: form.body.trim() || null,
        link: form.link.trim() || null,
        options,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        created_by: user?.id ?? null,
      });

      if (error) throw new Error(error.message);

      toast.success("Posted to the notice board");

      if (sendEmailBroadcast) {
        toast.info("Sending email broadcast to active members…");
        const { data: members } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("is_active", true);

        if (members && members.length > 0) {
          const recipients = members.map((m) => ({ email: m.email, name: m.full_name }));
          const mailRes = await sendClubEmail({
            data: {
              subject: `[Yuga Spark Notice] ${form.title.trim()}`,
              body: `${form.body.trim()}\n\n${form.link ? `Link: ${form.link.trim()}\n\n` : ""}View on portal: ${window.location.origin}/notices`,
              kind: "announcement",
              recipients,
            },
          });
          toast.success(`Emailed ${mailRes.sent} member(s) via Google SMTP`);
        }
      }

      setForm({ kind: "announcement", title: "", body: "", link: "", options: "", expires_at: "" });
      setSendEmailBroadcast(false);
      void notices.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post notice");
    } finally {
      setPosting(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void notices.refetch();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={add} className="surface h-fit space-y-3 p-4 sm:p-6">
        <h3 className="font-display text-lg font-bold">New notice</h3>
        <div>
          <Label>Type</Label>
          <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="external">Outside hackathon</SelectItem>
              <SelectItem value="link">Useful link</SelectItem>
              <SelectItem value="poll">Poll</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <Label>Details</Label>
          <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} />
        </div>
        <div>
          <Label>Link (optional)</Label>
          <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
        </div>
        {form.kind === "poll" ? (
          <div>
            <Label>Poll options (one per line)</Label>
            <Textarea
              value={form.options}
              onChange={(e) => setForm({ ...form, options: e.target.value })}
              rows={4}
            />
          </div>
        ) : null}
        <div>
          <Label>Expires on (optional)</Label>
          <Input
            type="datetime-local"
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="broadcast-email"
            checked={sendEmailBroadcast}
            onCheckedChange={(c) => setSendEmailBroadcast(Boolean(c))}
          />
          <Label htmlFor="broadcast-email" className="text-xs font-normal cursor-pointer flex items-center gap-1">
            <Mail className="h-3.5 w-3.5 text-primary" />
            Send email broadcast via Google SMTP
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={posting}>
          {posting ? "Posting…" : "Post notice"}
        </Button>
      </form>

      <div className="space-y-3">
        {(notices.data ?? []).map((n) => (
          <div key={n.id} className="surface flex items-start justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{n.title}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {n.kind} · {new Date(n.created_at).toLocaleDateString()}
                {n.expires_at
                  ? ` · ${new Date(n.expires_at).getTime() < Date.now() ? "expired" : `closes ${new Date(n.expires_at).toLocaleDateString()}`}`
                  : ""}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(n.id)} aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
