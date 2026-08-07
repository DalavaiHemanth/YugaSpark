import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Mail, Pin, AlertTriangle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { sendClubEmail } from "@/lib/email.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
    priority: "normal",
    is_pinned: false,
    expires_at: "",
  });

  const notices = useQuery({
    queryKey: ["notices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const activeBatchQuery = useQuery({
    queryKey: ["active-batch-name-notices"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("batches" as any)
          .select("name")
          .eq("is_active", true)
          .maybeSingle();
        return (data as { name: string } | null)?.name || null;
      } catch {
        return null;
      }
    },
  });
  const activeBatchName = activeBatchQuery.data;

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
        priority: form.priority,
        is_pinned: form.is_pinned,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        created_by: user?.id ?? null,
      });

      if (error) throw new Error(error.message);

      toast.success("Posted to the notice board");

      if (sendEmailBroadcast) {
        toast.info(`Sending email broadcast to active ${activeBatchName ? `Batch (${activeBatchName})` : ""} members…`);
        
        let query = supabase
          .from("profiles")
          .select("id, email, full_name, batch, is_active")
          .eq("is_active", true);

        if (activeBatchName) {
          query = query.eq("batch", activeBatchName);
        }

        const [{ data: members }, { data: roles }] = await Promise.all([
          query,
          supabase.from("user_roles").select("user_id, role"),
        ]);

        const adminIds = new Set(
          (roles ?? [])
            .filter((r) => String(r.role) === "admin" || String(r.role) === "super_admin")
            .map((r) => r.user_id)
        );

        const studentRecipients = (members ?? [])
          .filter((m) => !adminIds.has(m.id))
          .map((m) => ({ email: m.email, name: m.full_name }));

        if (studentRecipients.length > 0) {
          const mailRes = await sendClubEmail({
            data: {
              subject: `[Yuga Spark Notice] ${form.title.trim()}`,
              body: `${form.body.trim()}\n\n${form.link ? `Link: ${form.link.trim()}\n\n` : ""}View on portal: ${window.location.origin}/notices`,
              kind: "announcement",
              recipients: studentRecipients,
            },
          });
          toast.success(`Emailed ${mailRes.sent} student(s) of ${activeBatchName ? `Batch ${activeBatchName}` : "active batch"} via Google SMTP`);
        } else {
          toast.info(`No student accounts found for ${activeBatchName ? `Batch ${activeBatchName}` : "active batch"}`);
        }
      }

      setForm({
        kind: "announcement",
        title: "",
        body: "",
        link: "",
        options: "",
        priority: "normal",
        is_pinned: false,
        expires_at: "",
      });
      setSendEmailBroadcast(false);
      void notices.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post notice");
    } finally {
      setPosting(false);
    }
  }

  async function togglePin(id: string, currentPinned: boolean) {
    const { error } = await supabase
      .from("notices")
      .update({ is_pinned: !currentPinned })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(!currentPinned ? "Notice pinned to top!" : "Notice unpinned");
    void notices.refetch();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Notice deleted");
    void notices.refetch();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={add} className="surface h-fit space-y-3.5 p-4 sm:p-6">
        <h3 className="font-display text-lg font-bold">New notice</h3>
        <div>
          <Label className="text-xs">Type</Label>
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
          <Label className="text-xs">Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <Label className="text-xs">Priority</Label>
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="important">Important</SelectItem>
              <SelectItem value="urgent">Urgent 🔥</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Details</Label>
          <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} />
        </div>
        <div>
          <Label className="text-xs">Link (optional)</Label>
          <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
        </div>
        {form.kind === "poll" ? (
          <div>
            <Label className="text-xs">Poll options (one per line)</Label>
            <Textarea
              value={form.options}
              onChange={(e) => setForm({ ...form, options: e.target.value })}
              rows={3}
            />
          </div>
        ) : null}
        <div>
          <Label className="text-xs">Expires on (optional)</Label>
          <Input
            type="datetime-local"
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <Label htmlFor="pin-notice" className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
            <Pin className="h-3.5 w-3.5 text-primary" /> Pin to top
          </Label>
          <Switch
            id="pin-notice"
            checked={form.is_pinned}
            onCheckedChange={(c) => setForm({ ...form, is_pinned: c })}
          />
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <Checkbox
            id="broadcast-email"
            checked={sendEmailBroadcast}
            onCheckedChange={(c) => setSendEmailBroadcast(Boolean(c))}
          />
          <Label htmlFor="broadcast-email" className="text-xs font-normal cursor-pointer flex items-center gap-1">
            <Mail className="h-3.5 w-3.5 text-primary" />
            Send email broadcast to Active Batch {activeBatchName ? `(${activeBatchName})` : ""}
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={posting}>
          {posting ? "Posting…" : "Post notice"}
        </Button>
      </form>

      <div className="space-y-3">
        {(notices.data ?? []).map((n) => (
          <div key={n.id} className={`surface flex items-start justify-between gap-3 p-4 ${n.is_pinned ? "border-l-4 border-l-primary bg-primary/5" : ""}`}>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                {n.is_pinned ? (
                  <Badge variant="default" className="gap-1 text-[10px]">
                    <Pin className="h-3 w-3 fill-current" /> Pinned
                  </Badge>
                ) : null}
                {n.priority === "urgent" ? (
                  <Badge variant="destructive" className="gap-1 text-[10px]">
                    <AlertTriangle className="h-3 w-3" /> Urgent
                  </Badge>
                ) : n.priority === "important" ? (
                  <Badge variant="outline" className="gap-1 text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                    <AlertCircle className="h-3 w-3" /> Important
                  </Badge>
                ) : null}
                <p className="font-semibold text-sm truncate">{n.title}</p>
              </div>
              <p className="text-xs capitalize text-muted-foreground">
                {n.kind} · {new Date(n.created_at).toLocaleDateString()}
                {n.expires_at
                  ? ` · ${new Date(n.expires_at).getTime() < Date.now() ? "expired" : `closes ${new Date(n.expires_at).toLocaleDateString()}`}`
                  : ""}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void togglePin(n.id, Boolean(n.is_pinned))}
                title={n.is_pinned ? "Unpin notice" : "Pin notice to top"}
                className={n.is_pinned ? "text-primary" : "text-muted-foreground"}
              >
                <Pin className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => void remove(n.id)} aria-label="Delete">
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
