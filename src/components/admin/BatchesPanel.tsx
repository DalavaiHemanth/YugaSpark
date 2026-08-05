import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layers, Plus, CheckCircle2, XCircle, Trash2, Users, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/AppShell";

export type BatchItem = {
  id: string;
  name: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
};

export function BatchesPanel() {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);

  // Fetch batches
  const batches = useQuery({
    queryKey: ["admin-batches"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("batches" as any)
          .select("*")
          .order("name", { ascending: true });
        if (error) return [];
        return (data ?? []) as BatchItem[];
      } catch {
        return [];
      }
    },
  });

  // Fetch student counts per batch
  const memberCounts = useQuery({
    queryKey: ["batch-member-counts"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("batch");
        if (error || !data) return {} as Record<string, number>;
        
        const counts: Record<string, number> = {};
        for (const p of data) {
          if (p.batch) {
            counts[p.batch] = (counts[p.batch] || 0) + 1;
          }
        }
        return counts;
      } catch {
        return {} as Record<string, number>;
      }
    },
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error("Please enter a batch name (e.g. 2023-2027)");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase
        .from("batches" as any)
        .insert({
          name: cleanName,
          notes: notes.trim() || null,
          is_active: isActive,
        });

      if (error) throw new Error(error.message);

      toast.success(`Batch "${cleanName}" created successfully!`);
      setName("");
      setNotes("");
      setIsActive(true);
      await batches.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create batch");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBatchStatus(batch: BatchItem) {
    const nextState = !batch.is_active;
    try {
      const { error } = await supabase
        .from("batches" as any)
        .update({ is_active: nextState })
        .eq("id", batch.id);

      if (error) throw new Error(error.message);

      toast.success(`Batch "${batch.name}" marked as ${nextState ? "Active" : "Inactive"}`);
      await batches.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update batch status");
    }
  }

  async function deleteBatch(batch: BatchItem) {
    if (!confirm(`Are you sure you want to delete batch "${batch.name}"?`)) return;
    try {
      const { error } = await supabase
        .from("batches" as any)
        .delete()
        .eq("id", batch.id);

      if (error) throw new Error(error.message);

      toast.success(`Batch "${batch.name}" deleted`);
      await batches.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete batch");
    }
  }

  const batchList = batches.data ?? [];
  const counts = memberCounts.data ?? {};

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      {/* Create New Batch Form */}
      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="surface p-5">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </span>
            <h2 className="font-display text-sm font-bold">Add New Batch</h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Create a graduating cohort or semester batch for student classification and attendance tracking.
          </p>

          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Batch Name / Range</Label>
              <Input
                placeholder="e.g. 2023-2027"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Notes / Cohort Description</Label>
              <Input
                placeholder="e.g. 3rd Year B.Tech Students"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium">Set as Active Batch</Label>
                <p className="text-[11px] text-muted-foreground">
                  Active batches appear in onboarding & filters
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <Button type="submit" size="sm" className="w-full" disabled={busy}>
              {busy ? "Saving…" : "Create Batch"}
            </Button>
          </form>
        </div>
      </div>

      {/* Batches List Maintenance */}
      <div className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-sm font-bold">Batches Maintenance</h2>
              <p className="text-xs text-muted-foreground">
                Active & Inactive Student Cohorts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                void batches.refetch();
                void memberCounts.refetch();
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {batchList.length} Total
            </Badge>
          </div>
        </div>

        <ul className="divide-y divide-border">
          {batchList.map((batch) => {
            const studentCount = counts[batch.name] || 0;
            return (
              <li
                key={batch.id}
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-secondary/20 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                      batch.is_active
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {batch.is_active ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-bold text-foreground">
                        {batch.name}
                      </h3>
                      <Badge
                        variant={batch.is_active ? "secondary" : "outline"}
                        className={`text-[10px] ${
                          batch.is_active
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "text-muted-foreground"
                        }`}
                      >
                        {batch.is_active ? "Active" : "Inactive / Graduated"}
                      </Badge>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {batch.notes || "No notes provided"}
                    </p>

                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground font-mono">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        <strong>{studentCount}</strong> member{studentCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
                    <Label className="text-xs font-medium cursor-pointer" htmlFor={`switch-${batch.id}`}>
                      {batch.is_active ? "Active" : "Inactive"}
                    </Label>
                    <Switch
                      id={`switch-${batch.id}`}
                      checked={batch.is_active}
                      onCheckedChange={() => void toggleBatchStatus(batch)}
                    />
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
                    onClick={() => void deleteBatch(batch)}
                    title="Delete batch"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}

          {batchList.length === 0 ? (
            <li className="p-6">
              <EmptyState
                icon={Layers}
                title="No batches defined"
                description="Add your first batch using the form on the left to classify your club members."
              />
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
