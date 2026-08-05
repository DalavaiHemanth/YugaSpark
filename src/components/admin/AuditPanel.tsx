import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollText, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "student", label: "Students" },
  { key: "hackathon", label: "Hackathons" },
  { key: "access", label: "Access" },
  { key: "allowed_email", label: "Allowed emails" },
];

const ACTION_TONE: Record<string, string> = {
  insert: "bg-emerald-500/10 text-emerald-700",
  update: "bg-amber-500/10 text-amber-700",
  delete: "bg-destructive/10 text-destructive",
  password_reset: "bg-primary/10 text-primary",
  invite: "bg-primary/10 text-primary",
};

function label(action: string) {
  return action.replace(/_/g, " ");
}

export function AuditPanel() {
  const [entity, setEntity] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const logs = useQuery({
    queryKey: ["audit-logs", entity],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (entity !== "all") query = query.eq("entity", entity);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const rows = (logs.data ?? []).filter((r) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return (
      r.summary.toLowerCase().includes(needle) ||
      (r.actor_email ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <div className="space-y-4">
      <div className="surface flex flex-wrap items-center gap-2 p-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setEntity(f.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                entity === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 hover:bg-secondary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search summary or admin…"
          className="h-9 w-full sm:w-64"
        />
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => void logs.refetch()}
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="surface p-10 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
            <ScrollText className="h-5 w-5" />
          </span>
          <p className="mt-3 font-display text-sm font-bold">No activity recorded yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Every student edit, hackathon change, access toggle and password reset will appear
            here with the admin who did it and the exact time.
          </p>
        </div>
      ) : (
        <div className="surface overflow-hidden">
          {rows.map((r) => (
            <div key={r.id} className="border-b border-border last:border-0">
              <button
                type="button"
                onClick={() => setOpen(open === r.id ? null : r.id)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
              >
                <Badge
                  className={`mt-0.5 shrink-0 border-0 font-mono text-[10px] uppercase ${
                    ACTION_TONE[r.action] ?? "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {label(r.action)}
                </Badge>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.summary}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {r.actor_email ?? "System"} · {new Date(r.created_at).toLocaleString()}
                  </span>
                </span>
              </button>
              {open === r.id ? (
                <pre className="overflow-x-auto border-t border-border bg-secondary/30 px-4 py-3 font-mono text-[11px] text-muted-foreground">
                  {JSON.stringify(r.details, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
