import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Filter = "all" | "sent" | "failed";

/** Read-only record of every email the app has delivered. */
export function EmailLogPanel() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const logs = useQuery({
    queryKey: ["email-logs"],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_logs")
        .select("id,recipient,recipient_name,subject,kind,status,error,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (logs.data ?? []).filter((l) => {
      if (filter !== "all" && l.status !== filter) return false;
      if (!term) return true;
      return [l.recipient, l.recipient_name, l.subject]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [logs.data, q, filter]);

  const sent = (logs.data ?? []).filter((l) => l.status === "sent").length;
  const failed = (logs.data ?? []).length - sent;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface p-4">
          <p className="label-mono text-muted-foreground">Total logged</p>
          <p className="mt-1 text-2xl font-semibold">{(logs.data ?? []).length}</p>
        </div>
        <div className="surface p-4">
          <p className="label-mono text-muted-foreground">Delivered</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{sent}</p>
        </div>
        <div className="surface p-4">
          <p className="label-mono text-muted-foreground">Failed</p>
          <p className="mt-1 text-2xl font-semibold text-destructive">{failed}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search recipient or subject…"
          className="sm:max-w-xs"
        />
        <div className="flex gap-2">
          {(["all", "sent", "failed"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              className="capitalize"
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => void logs.refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="surface divide-y divide-border overflow-hidden">
        {logs.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No emails sent yet. Announcements and results emails appear here once delivered.
          </p>
        ) : (
          rows.map((l) => (
            <div key={l.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{l.subject}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {l.recipient_name ? `${l.recipient_name} · ` : ""}
                  {l.recipient}
                </p>
                {l.error ? (
                  <p className="mt-1 text-xs text-destructive break-words">{l.error}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {l.kind}
                </Badge>
                <Badge variant={l.status === "sent" ? "secondary" : "destructive"}>{l.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(l.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}