import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Layers,
  Plus,
  CheckCircle2,
  Radio,
  Trash2,
  Users,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Search,
  Download,
  UserCheck,
  UserX,
  FileText,
  Image,
} from "lucide-react";
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

type ProfileMember = {
  id: string;
  email: string;
  full_name: string | null;
  registration_number: string | null;
  year: string | null;
  batch: string | null;
  personal_email: string | null;
  profile_completed: boolean;
  is_active: boolean;
  photo_url: string | null;
  resume_url: string | null;
};

export function BatchesPanel() {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [makeActive, setMakeActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expandedBatchName, setExpandedBatchName] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");

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

  // Fetch all profiles for student mapping
  const profilesQuery = useQuery({
    queryKey: ["all-batch-profiles"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("full_name");
        if (error) return [];
        return (data ?? []) as ProfileMember[];
      } catch {
        return [];
      }
    },
  });

  // Group members by batch
  const membersByBatch = (profilesQuery.data ?? []).reduce((acc, member) => {
    const b = member.batch || "Unassigned";
    if (!acc[b]) acc[b] = [];
    acc[b].push(member);
    return acc;
  }, {} as Record<string, ProfileMember[]>);

  // Activate single batch (deactivates all others)
  async function activateSingleBatch(targetBatch: BatchItem) {
    if (targetBatch.is_active) return;
    setBusy(true);
    try {
      // Step 1: Deactivate all batches
      const { error: deactivateErr } = await supabase
        .from("batches" as any)
        .update({ is_active: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");

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
          is_active: makeActive || (batches.data?.length === 0),
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

  async function exportBatchStudentsToExcel(batchName: string, students: ProfileMember[]) {
    try {
      const XLSX = await import("xlsx");
      const rows = students.map((m, idx) => ({
        "#": idx + 1,
        "Full Name": m.full_name || "—",
        Email: m.email,
        "Registration Number": m.registration_number || "—",
        Year: m.year || "—",
        Batch: m.batch || batchName,
        "Personal Email": m.personal_email || "—",
        Status: !m.is_active ? "Inactive" : m.profile_completed ? "Complete" : "Pending",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Batch ${batchName}`);
      XLSX.writeFile(wb, `Batch_${batchName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Students.xlsx`);
      toast.success(`Exported ${students.length} students from Batch ${batchName} to Excel!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  const batchList = batches.data ?? [];
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
                  ? `${activeBatch.notes || "Current active cohort"} · ${(membersByBatch[activeBatch.name] || []).length} active members assigned`
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

        {/* Batches Maintenance List & Assigned Student Roster */}
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Layers className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display text-sm font-bold">Batches Maintenance</h2>
                <p className="text-xs text-muted-foreground">
                  View assigned students & manage active batch
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
                  void profilesQuery.refetch();
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Badge variant="secondary" className="font-mono text-[11px]">
                {batchList.length} Batches
              </Badge>
            </div>
          </div>

          <ul className="divide-y divide-border">
            {batchList.map((batch) => {
              const assignedStudents = membersByBatch[batch.name] || [];
              const studentCount = assignedStudents.length;
              const isCurrentActive = batch.is_active;
              const isExpanded = expandedBatchName === batch.name;

              const filteredStudents = assignedStudents.filter((s) => {
                if (!studentSearch.trim()) return true;
                const term = studentSearch.trim().toLowerCase();
                return [s.full_name, s.email, s.registration_number, s.year, s.personal_email]
                  .filter(Boolean)
                  .some((v) => String(v).toLowerCase().includes(term));
              });

              return (
                <li key={batch.id} className="transition-colors">
                  <div
                    className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
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

                        <div className="mt-2 flex items-center gap-3 text-xs font-mono">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs gap-1.5 bg-primary/10 text-primary hover:bg-primary/20"
                            onClick={() => {
                              setExpandedBatchName(isExpanded ? null : batch.name);
                              setStudentSearch("");
                            }}
                          >
                            <Users className="h-3.5 w-3.5" />
                            <strong>{studentCount}</strong> Student{studentCount === 1 ? "" : "s"} Assigned
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center">
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
                  </div>

                  {/* Expanded Student Roster Section */}
                  {isExpanded ? (
                    <div className="border-t border-border bg-secondary/30 p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            Students Roster — Batch: {batch.name} ({filteredStudents.length}/{studentCount})
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              className="h-8.5 pl-8 text-xs bg-background"
                              placeholder="Search student name, email, reg no..."
                              value={studentSearch}
                              onChange={(e) => setStudentSearch(e.target.value)}
                            />
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8.5 gap-1.5 text-xs"
                            disabled={studentCount === 0}
                            onClick={() => void exportBatchStudentsToExcel(batch.name, assignedStudents)}
                          >
                            <Download className="h-3.5 w-3.5 text-primary" />
                            Excel
                          </Button>
                        </div>
                      </div>

                      {/* Student Table Roster */}
                      {filteredStudents.length > 0 ? (
                        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="border-b border-border bg-secondary/50 font-mono text-muted-foreground uppercase text-[10px]">
                                <tr>
                                  <th className="px-4 py-3">Student Name</th>
                                  <th className="px-4 py-3">Reg. Number</th>
                                  <th className="px-4 py-3">Year</th>
                                  <th className="px-4 py-3">Email</th>
                                  <th className="px-4 py-3 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {filteredStudents.map((student) => {
                                  const initials = (student.full_name ?? student.email)
                                    .split(/[\s@.]+/)
                                    .filter(Boolean)
                                    .map((p) => p[0])
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase();

                                  return (
                                    <tr key={student.id} className="hover:bg-secondary/30 transition-colors">
                                      <td className="px-4 py-3 font-medium text-foreground">
                                        <div className="flex items-center gap-2.5">
                                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-[10px] font-bold text-primary">
                                            {initials}
                                          </span>
                                          <div>
                                            <p className="truncate font-semibold">{student.full_name || "Unnamed Student"}</p>
                                            {student.personal_email ? (
                                              <p className="truncate text-[10px] text-muted-foreground">{student.personal_email}</p>
                                            ) : null}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 font-mono font-medium text-foreground">
                                        {student.registration_number || "—"}
                                      </td>
                                      <td className="px-4 py-3 text-muted-foreground">
                                        {student.year || "—"}
                                      </td>
                                      <td className="px-4 py-3 font-mono text-muted-foreground">
                                        {student.email}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <Badge
                                            variant={student.profile_completed ? "secondary" : "outline"}
                                            className="text-[9px]"
                                          >
                                            {student.profile_completed ? "complete" : "pending"}
                                          </Badge>
                                          {!student.is_active ? (
                                            <Badge variant="destructive" className="text-[9px]">
                                              inactive
                                            </Badge>
                                          ) : null}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
                          <p className="text-xs text-muted-foreground">
                            {studentCount === 0
                              ? `No students are currently assigned to Batch "${batch.name}". Assign students from the Members console.`
                              : `No students in Batch "${batch.name}" match your search.`}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
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
