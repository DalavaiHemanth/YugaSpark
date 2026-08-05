import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layers, Plus, CheckCircle2, Radio, Trash2, Users, RefreshCw, Sparkles, ShieldCheck } from "lucide-react";
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
  const [makeActive, setMakeActive] = useState(false);
  const [busy, setBusy] = useState(false);

  // Fetch all batches
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

  // Activate single batch (deactivates all others)
  async function activateSingleBatch(targetBatch: BatchItem) {
    if (targetBatch.is_active) return; // already active
    setBusy(true);
    try {
      // Step 1: Deactivate all batches
      const { error: deactivateErr } = await supabase
        .from("batches" as any)
        .update({ is_active: false })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // all rows

      if (deactivateErr) throw new Error(deactivateErr.message);

      // Step 2: Activate target batch
      const { error: activateErr } = await supabase
        .from("batches" as any)
        .update({ is_active: true })
        .eq("id", targetBatch.id);

      if (activateErr) throw new Error(activateErr.message);

      toast.success(`Active Batch switched to "${targetBatch.name}"!`);
      await batches.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to switch active batch");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error("Please enter a batch name (e.g. 2023-2027)");
      return;
    }

    setBusy(true);
    try {
      // If setting as active, deactivate all existing batches first
      if (makeActive) {
        await supabase
          .from("batches" as any)
          .update({ is_active: false })
          .neq("id", "00000000-0000-0000-0000-000000000000");
      }

      const { error } = await supabase
        .from("batches" as any)
        .insert({
          name: cleanName,
          notes: notes.trim() || null,
          is_active: makeActive || (batches.data?.length === 0), // default active if first batch
        });

      if (error) throw new Error(error.message);

      toast.success(`Batch "${cleanName}" created successfully!`);
      setName("");
      setNotes("");
      setMakeActive(false);
      await batches.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create batch");
    } finally {
      setBusy(false);
    }
  }

  async function deleteBatch(batch: BatchItem) {
    if (batch.is_active && batchList.length > 1) {
      toast.error("Cannot delete the currently ACTIVE batch. Please activate another batch first.");
      return;
    }

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
  const activeBatch = batchList.find((b) => b.is_active) || batchList[0];

  return (
    <div className="space-y-6">
      {/* Current Active Batch Hero Banner */}
      <div className="rounded-xl border border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <Sparkles className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Platform Active Batch
                </span>
                <Badge variant="default" className="bg-emerald-600 text-white text-[10px]">
                  1 Active Batch Limit Enforced
                </Badge>
              </div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                {activeBatch ? activeBatch.name : "No Active Batch Set"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {activeBatch
                  ? `${activeBatch.notes || "Current active cohort"} · ${counts[activeBatch.name] || 0} active members assigned`
                  : "Please select an active batch below."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 px-3 text-xs font-mono text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Only 1 batch active at a time</span>
          </div>
        </div>
      </div>

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
              Create a graduating cohort or semester batch for student classification.
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
                  <Label className="text-xs font-medium">Make Platform Active Batch</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Switches platform active batch to this new batch
                  </p>
                </div>
                <Switch checked={makeActive} onCheckedChange={setMakeActive} />
              </div>

              <Button type="submit" size="sm" className="w-full" disabled={busy}>
                {busy ? "Saving…" : "Create Batch"}
              </Button>
            </form>
          </div>
        </div>

        {/* Batches Maintenance List */}
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Layers className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display text-sm font-bold">Batches Maintenance</h2>
                <p className="text-xs text-muted-foreground">
                  Select which batch is currently Active across the platform
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
              const isCurrentActive = batch.is_active;

              return (
                <li
                  key={batch.id}
                  className={`flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
                    isCurrentActive
                      ? "bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary"
                      : "hover:bg-secondary/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => void activateSingleBatch(batch)}
                      disabled={busy || isCurrentActive}
                      className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full transition-all ${
                        isCurrentActive
                          ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40"
                          : "bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary"
                      }`}
                      title={isCurrentActive ? "Currently Active Batch" : "Click to make Active Batch"}
                    >
                      {isCurrentActive ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Radio className="h-4 w-4 opacity-70" />
                      )}
                    </button>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-bold text-foreground">
                          {batch.name}
                        </h3>
                        {isCurrentActive ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] gap-1">
                            <Sparkles className="h-3 w-3" /> ACTIVE BATCH
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Inactive / Archived
                          </Badge>
                        )}
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
                    {!isCurrentActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void activateSingleBatch(batch)}
                        className="h-8 text-xs gap-1.5"
                      >
                        <Radio className="h-3.5 w-3.5 text-primary" />
                        Set Active
                      </Button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Platform Active
                      </span>
                    )}

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
    </div>
  );
}
