import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck, QrCode, Download, Plus, CheckCircle2, XCircle, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QrScannerModal } from "@/components/admin/QrScannerModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function SaturdayAttendancePanel() {
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [creating, setCreating] = useState(false);

  // New Session Form State
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [batchSemester, setBatchSemester] = useState("All Batches");
  const [topic, setTopic] = useState("");

  // Edit & Delete Session State
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editBatch, setEditBatch] = useState("All Batches");
  const [editTopic, setEditTopic] = useState("");
  const [updatingSession, setUpdatingSession] = useState(false);

  function openEditModal(session: any) {
    setEditingSession(session);
    setEditTitle(session.title || "");
    setEditDate(session.session_date || new Date().toISOString().slice(0, 10));
    setEditBatch(session.batch_semester || "All Batches");
    setEditTopic(session.topic || "");
  }

  async function handleUpdateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSession || !editTitle.trim()) return;
    setUpdatingSession(true);
    try {
      const { error } = await supabase
        .from("club_sessions" as any)
        .update({
          title: editTitle.trim(),
          session_date: editDate,
          batch_semester: editBatch,
          topic: editTopic.trim() || null,
        })
        .eq("id", editingSession.id);

      if (error) throw new Error(error.message);

      toast.success("Session updated successfully!");
      setEditingSession(null);
      void sessions.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update session");
    } finally {
      setUpdatingSession(false);
    }
  }

  async function handleDeleteSession(session: any) {
    if (!session) return;
    if (
      !confirm(
        `Are you sure you want to delete session "${session.title}" and all its attendance records? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      const { error } = await supabase
        .from("club_sessions" as any)
        .delete()
        .eq("id", session.id);

      if (error) throw new Error(error.message);

      toast.success("Session deleted");
      setSelectedSessionId("");
      void sessions.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete session");
    }
  }

  // 1. Fetch Sessions
  const sessions = useQuery({
    queryKey: ["club-sessions"],
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("club_sessions" as any)
          .select("*")
          .order("session_date", { ascending: false });
        if (error) return [];
        return (data ?? []) as any[];
      } catch {
        return [];
      }
    },
  });

  // 1b. Fetch Active Batches defined by Admin
  const activeBatchesQuery = useQuery({
    queryKey: ["active-batches-list"],
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("batches" as any)
          .select("id, name")
          .eq("is_active", true)
          .order("name");
        if (error) return [];
        return (data ?? []) as { id: string; name: string }[];
      } catch {
        return [];
      }
    },
  });

  const activeBatchObj = activeBatchesQuery.data?.[0];

  useEffect(() => {
    if (activeBatchObj?.name) {
      setBatchSemester(activeBatchObj.name);
    }
  }, [activeBatchObj?.name]);

  const activeSession = (sessions.data ?? []).find((s) => s.id === selectedSessionId) || sessions.data?.[0];
  const activeSessionId = activeSession?.id || "";

  // 2. Fetch Members / Students
  const members = useQuery({
    queryKey: ["saturday-members"],
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email, registration_number, year, batch, is_active")
          .order("full_name");
        if (error) return [];
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  // 2b. Fetch Admin User IDs to exclude admins from student attendance sheet
  const adminUsersQuery = useQuery({
    queryKey: ["saturday-admin-user-ids"],
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        return new Set((data ?? []).map((r) => r.user_id));
      } catch {
        return new Set<string>();
      }
    },
  });

  // Unique batches present in member records
  const availableBatches = Array.from(
    new Set((members.data ?? []).map((m) => m.batch).filter(Boolean)),
  ) as string[];

  // 3. Fetch Attendance for active session
  const attendance = useQuery({
    queryKey: ["session-attendance", activeSessionId],
    enabled: Boolean(activeSessionId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("session_attendance" as any)
          .select("*")
          .eq("session_id", activeSessionId);
        if (error) return [];
        return (data ?? []) as any[];
      } catch {
        return [];
      }
    },
  });

  const attendanceMap = new Map((attendance.data ?? []).map((a) => [a.user_id, a]));

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("club_sessions" as any)
        .insert({
          title: title.trim(),
          session_date: date,
          batch_semester: batchSemester,
          topic: topic.trim() || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      toast.success("Session created!");
      setTitle("");
      setTopic("");
      void sessions.refetch();
      if (data) setSelectedSessionId((data as any).id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  }

  async function toggleAttendance(userId: string, isPresent: boolean) {
    if (!activeSessionId) return;
    try {
      if (isPresent) {
        const { error } = await supabase.from("session_attendance" as any).upsert(
          {
            session_id: activeSessionId,
            user_id: userId,
            status: "present",
            scanned_at: new Date().toISOString(),
          },
          { onConflict: "session_id,user_id" },
        );
        if (error) throw new Error(error.message);
        toast.success("Marked Present");
      } else {
        const existing = attendanceMap.get(userId);
        if (existing) {
          const { error } = await supabase
            .from("session_attendance" as any)
            .delete()
            .eq("id", existing.id);
          if (error) throw new Error(error.message);
          toast.success("Marked Absent");
        }
      }
      void attendance.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  function parseYearNum(yearStr: string | null | undefined): number {
    if (!yearStr) return 999;
    const match = yearStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 998;
  }

  async function exportAttendanceExcel() {
    if (!activeSession) return;
    try {
      const XLSX = await import("xlsx");
      
      // Sort students by Year (numeric) then Registration Number / Full Name
      const sortedStudents = [...visibleStudents].sort((a, b) => {
        const yA = parseYearNum(a.year);
        const yB = parseYearNum(b.year);
        if (yA !== yB) return yA - yB;
        const regA = (a.registration_number || "").toLowerCase();
        const regB = (b.registration_number || "").toLowerCase();
        if (regA !== regB) return regA.localeCompare(regB);
        return (a.full_name || "").toLowerCase().localeCompare((b.full_name || "").toLowerCase());
      });

      const rows: Record<string, unknown>[] = sortedStudents.map((m, idx) => {
        const att = attendanceMap.get(m.id);
        return {
          "#": idx + 1,
          "Registration Number": m.registration_number || "—",
          "Full Name": m.full_name || "—",
          "Year": m.year || "—",
          "Present Status": att ? "PRESENT" : "ABSENT",
        };
      });

      const totalStudents = sortedStudents.length;
      const presentCnt = sortedStudents.filter((m) => attendanceMap.has(m.id)).length;
      const absentCnt = totalStudents - presentCnt;
      const turnoutPct = totalStudents > 0 ? `${Math.round((presentCnt / totalStudents) * 100)}%` : "0%";

      // Blank separator row
      rows.push({
        "#": "",
        "Registration Number": "",
        "Full Name": "",
        "Year": "",
        "Present Status": "",
      });

      // Summary section at the bottom
      rows.push({
        "#": "",
        "Registration Number": "SUMMARY STATISTICS",
        "Full Name": "",
        "Year": "",
        "Present Status": "",
      });
      rows.push({
        "#": "",
        "Registration Number": "Total Students",
        "Full Name": totalStudents,
        "Year": "",
        "Present Status": "",
      });
      rows.push({
        "#": "",
        "Registration Number": "Total Present",
        "Full Name": presentCnt,
        "Year": "",
        "Present Status": "",
      });
      rows.push({
        "#": "",
        "Registration Number": "Total Absent",
        "Full Name": absentCnt,
        "Year": "",
        "Present Status": "",
      });
      rows.push({
        "#": "",
        "Registration Number": "Attendance Turnout",
        "Full Name": turnoutPct,
        "Year": "",
        "Present Status": "",
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 28 },
        { wch: 14 },
        { wch: 18 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance Register");

      const cleanTitle = activeSession.title.replace(/[^a-zA-Z0-9_-]/g, "_");
      XLSX.writeFile(wb, `Attendance_${cleanTitle}_${activeSession.session_date}.xlsx`);
      toast.success("Attendance register exported to Excel!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  async function exportMasterCumulativeAttendanceExcel() {
    try {
      const XLSX = await import("xlsx");
      toast.info("Generating Master Cumulative Attendance Report…");

      const { data: allSessionsData, error: sessError } = await supabase
        .from("club_sessions" as any)
        .select("id, title, session_date, batch_semester")
        .order("session_date", { ascending: true });

      if (sessError) throw new Error(sessError.message);

      const allSessions = (allSessionsData ?? []) as Array<{
        id: string;
        title: string;
        session_date: string;
        batch_semester: string;
      }>;

      if (!allSessions.length) {
        toast.error("No Saturday sessions found to export");
        return;
      }

      const { data: allAttendanceData, error: attError } = await supabase
        .from("session_attendance" as any)
        .select("session_id, user_id, status");

      if (attError) throw new Error(attError.message);

      const attendanceRecords = (allAttendanceData ?? []) as Array<{
        session_id: string;
        user_id: string;
        status: string;
      }>;

      const presentSet = new Set(
        attendanceRecords
          .filter((a) => a.status === "present")
          .map((a) => `${a.user_id}_${a.session_id}`)
      );

      // Filter student list according to selected batch filter if not "all"
      const selectedBatch = batchFilter;
      const studentList = (members.data ?? []).filter((m) => {
        if (!m.is_active) return false;
        if (adminUsersQuery.data?.has(m.id)) return false;
        if (selectedBatch !== "all") {
          if (m.batch !== selectedBatch && m.year !== selectedBatch) return false;
        }
        return true;
      });

      if (!studentList.length) {
        toast.error(`No active students found for batch "${selectedBatch}"`);
        return;
      }

      // Sort student list by Year (numeric) then Registration Number / Full Name
      studentList.sort((a, b) => {
        const yA = parseYearNum(a.year);
        const yB = parseYearNum(b.year);
        if (yA !== yB) return yA - yB;
        const regA = (a.registration_number || "").toLowerCase();
        const regB = (b.registration_number || "").toLowerCase();
        if (regA !== regB) return regA.localeCompare(regB);
        return (a.full_name || "").toLowerCase().localeCompare((b.full_name || "").toLowerCase());
      });

      const sessionPresentCounts: Record<string, number> = {};
      for (const sess of allSessions) {
        sessionPresentCounts[sess.id] = 0;
      }

      const rows = studentList.map((m, idx) => {
        const baseRow: Record<string, unknown> = {
          "#": idx + 1,
          "Registration Number": m.registration_number || "—",
          "Full Name": m.full_name || "—",
          "Year": m.year || "—",
        };

        let attendedCount = 0;

        for (const sess of allSessions) {
          const key = `${m.id}_${sess.id}`;
          const isPresent = presentSet.has(key);
          const colHeader = `${sess.session_date} (${sess.title})`;
          baseRow[colHeader] = isPresent ? "P" : "A";
          if (isPresent) {
            attendedCount++;
            sessionPresentCounts[sess.id] = (sessionPresentCounts[sess.id] || 0) + 1;
          }
        }

        const totalSessions = allSessions.length;
        const pct = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 0;

        baseRow["Total Attended"] = attendedCount;
        baseRow["Total Sessions"] = totalSessions;
        baseRow["Attendance %"] = `${pct}%`;

        return baseRow;
      });

      // Blank separator row
      rows.push({
        "#": "",
        "Registration Number": "",
        "Full Name": "",
        "Year": "",
      });

      // Total count summary row per session
      const summaryRow: Record<string, unknown> = {
        "#": "",
        "Registration Number": "TOTAL PRESENT",
        "Full Name": `Students: ${studentList.length}`,
        "Year": "Per Session",
      };

      let grandTotalPresents = 0;
      for (const sess of allSessions) {
        const colHeader = `${sess.session_date} (${sess.title})`;
        const count = sessionPresentCounts[sess.id] || 0;
        summaryRow[colHeader] = `${count} Present`;
        grandTotalPresents += count;
      }
      const maxPossible = studentList.length * allSessions.length;
      const overallPct = maxPossible > 0 ? Math.round((grandTotalPresents / maxPossible) * 100) : 0;

      summaryRow["Total Attended"] = grandTotalPresents;
      summaryRow["Total Sessions"] = maxPossible;
      summaryRow["Attendance %"] = `${overallPct}%`;

      rows.push(summaryRow);

      const ws = XLSX.utils.json_to_sheet(rows);

      ws["!cols"] = [
        { wch: 5 },
        { wch: 20 },
        { wch: 26 },
        { wch: 12 },
        ...allSessions.map(() => ({ wch: 22 })),
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Master Tracker");
      const batchLabel = selectedBatch !== "all" ? selectedBatch.replace(/[^a-zA-Z0-9_-]/g, "_") : "All_Batches";
      XLSX.writeFile(wb, `Yuga_Spark_Master_Attendance_${batchLabel}.xlsx`);

      toast.success(`Master Attendance Tracker exported for ${selectedBatch === "all" ? "All Batches" : `Batch ${selectedBatch}`}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  // Filter students by Admin role, Target Batch, and Search
  const visibleStudents = (members.data ?? []).filter((m) => {
    // Exclude inactive members
    if (!m.is_active) return false;

    // Exclude Admin accounts from student attendance registers
    if (adminUsersQuery.data?.has(m.id)) return false;

    // Enforce target batch of current active session (if specified and not "All Batches")
    const targetBatch = activeSession?.batch_semester;
    if (targetBatch && targetBatch !== "All Batches" && batchFilter === "all") {
      if (m.batch !== targetBatch) return false;
    } else if (batchFilter !== "all" && m.batch !== batchFilter && m.year !== batchFilter) {
      return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.full_name ?? "").toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.registration_number ?? "").toLowerCase().includes(q) ||
      (m.batch ?? "").toLowerCase().includes(q) ||
      (m.year ?? "").toLowerCase().includes(q)
    );
  });

  const presentCount = visibleStudents.filter((m) => attendanceMap.has(m.id)).length;
  const totalCount = visibleStudents.length;
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {showQrScanner && activeSession ? (
        <QrScannerModal
          hackathonId={activeSessionId}
          hackathonTitle={`Session: ${activeSession.title}`}
          onClose={() => setShowQrScanner(false)}
          onSuccess={() => void attendance.refetch()}
        />
      ) : null}

      {/* New Session Creation Form */}
      <div className="surface p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-primary" />
          <h2 className="font-display text-base font-bold">New Session Attendance Register</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Create an attendance register for weekly club sessions, workshops, or semester batches.
        </p>

        <form onSubmit={handleCreateSession} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="session-title" className="text-xs">Session Title</Label>
            <Input
              id="session-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Session #5 - Web Bootcamp"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-date" className="text-xs">Date</Label>
            <Input
              id="session-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-batch" className="text-xs">Target Batch</Label>
            <Select value={batchSemester} onValueChange={setBatchSemester}>
              <SelectTrigger id="session-batch" className="h-9 text-xs bg-background">
                <SelectValue placeholder="Select Target Batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Batches">All Batches</SelectItem>
                {activeBatchesQuery.data && activeBatchesQuery.data.length > 0 ? (
                  activeBatchesQuery.data.map((b) => (
                    <SelectItem key={b.id} value={b.name}>
                      Batch: {b.name}
                    </SelectItem>
                  ))
                ) : (
                  availableBatches.map((b) => (
                    <SelectItem key={b} value={b}>
                      Batch: {b}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="session-topic" className="text-xs">Topic / Notes (Optional)</Label>
            <Input
              id="session-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. React & Supabase"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={creating || !title.trim()} className="gap-2">
              <Plus className="h-4 w-4" />
              {creating ? "Creating Session…" : "Create Attendance Register"}
            </Button>
          </div>
        </form>
      </div>

      {/* Session Selector & Attendance Sheet */}
      <div className="surface p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Session</Label>
            <Select
              value={activeSessionId || ""}
              onValueChange={(val) => setSelectedSessionId(val)}
            >
              <SelectTrigger className="w-full sm:w-[320px]">
                <SelectValue placeholder="Pick a session..." />
              </SelectTrigger>
              <SelectContent>
                {(sessions.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title} ({s.session_date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeSession ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setShowQrScanner(true)}
              >
                <QrCode className="h-4 w-4" />
                Scan Badge QR
              </Button>
              <Button
                variant="outline"
                onClick={exportMasterCumulativeAttendanceExcel}
                className="gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
                title="Download single master CSV/Excel containing attendance for all weeks"
              >
                <Download className="h-4 w-4" />
                Export Master All-Weeks CSV/Excel
              </Button>
              <Button variant="outline" onClick={exportAttendanceExcel} className="gap-1.5 text-xs">
                <Download className="h-4 w-4" />
                Export Session Register
              </Button>
            </div>
          ) : null}
        </div>

        {activeSession ? (
          <>
            {/* Active Session Info & Stats Header */}
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-bold">{activeSession.title}</h3>
                  <Badge variant="secondary">{activeSession.batch_semester}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => openEditModal(activeSession)}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit Session
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => void handleDeleteSession(activeSession)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Date: {new Date(activeSession.session_date).toDateString()} {activeSession.topic ? `· Topic: ${activeSession.topic}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-4 text-center">
                <div className="surface px-3 py-1.5">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">Present</p>
                  <p className="text-lg font-bold text-emerald-600">{presentCount}</p>
                </div>
                <div className="surface px-3 py-1.5">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">Absent</p>
                  <p className="text-lg font-bold text-destructive">{totalCount - presentCount}</p>
                </div>
                <div className="surface px-3 py-1.5">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">Turnout</p>
                  <p className="text-lg font-bold text-primary">{percentage}%</p>
                </div>
              </div>
            </div>

            {/* Filters: Search & Batch Filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, roll number, email…"
                  className="pl-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                <span className="text-xs font-medium text-muted-foreground mr-1">Batch:</span>
                <Button
                  size="sm"
                  variant={batchFilter === "all" ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setBatchFilter("all")}
                >
                  All Batches
                </Button>
                {availableBatches.map((b) => (
                  <Button
                    key={b}
                    size="sm"
                    variant={batchFilter === b ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setBatchFilter(b)}
                  >
                    {b}
                  </Button>
                ))}
              </div>
            </div>

            {/* Attendance Register Table */}
            <div className="overflow-hidden rounded-xl border border-border mt-2">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Student Name</th>
                    <th className="px-4 py-3 font-medium">Registration Number</th>
                    <th className="px-4 py-3 font-medium">Batch / Year</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleStudents.map((m, idx) => {
                    const att = attendanceMap.get(m.id);
                    const isPresent = Boolean(att);
                    return (
                      <tr key={m.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {m.full_name || "Unnamed Student"}
                          <span className="block text-[11px] font-mono text-muted-foreground font-normal">{m.email}</span>
                        </td>
                        <td className="px-4 py-3 font-mono">{m.registration_number || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {m.batch ? (
                              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                {m.batch}
                              </Badge>
                            ) : null}
                            <Badge variant="outline" className="text-[10px]">{m.year || "Year N/A"}</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isPresent ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[11px]">
                              <CheckCircle2 className="h-3 w-3" /> Present ({new Date(att.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-muted-foreground bg-secondary px-2 py-0.5 rounded-full text-[11px]">
                              <XCircle className="h-3 w-3 opacity-40" /> Absent
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Switch
                            checked={isPresent}
                            onCheckedChange={(val) => void toggleAttendance(m.id, val)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {visibleStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No students match the selected batch or search filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No sessions created yet. Use the form above to create your first session attendance register.
          </p>
        )}
      </div>

      {/* Edit Session Modal */}
      <Dialog
        open={Boolean(editingSession)}
        onOpenChange={(v) => {
          if (!v && !updatingSession) setEditingSession(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Pencil className="h-4 w-4 text-primary" />
              Edit Session Details
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify the title, date, target batch, or notes for this attendance register.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateSession} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-session-title" className="text-xs font-medium">
                Session Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-session-title"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g. Session #5 - Web Bootcamp"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-session-date" className="text-xs font-medium">
                Session Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-session-date"
                type="date"
                required
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-session-batch" className="text-xs font-medium">Target Batch</Label>
              <Select value={editBatch} onValueChange={setEditBatch}>
                <SelectTrigger id="edit-session-batch" className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Select Target Batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Batches">All Batches</SelectItem>
                  {activeBatchesQuery.data && activeBatchesQuery.data.length > 0 ? (
                    activeBatchesQuery.data.map((b) => (
                      <SelectItem key={b.id} value={b.name}>
                        Batch: {b.name}
                      </SelectItem>
                    ))
                  ) : (
                    availableBatches.map((b) => (
                      <SelectItem key={b} value={b}>
                        Batch: {b}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-session-topic" className="text-xs font-medium">Topic / Notes (Optional)</Label>
              <Input
                id="edit-session-topic"
                value={editTopic}
                onChange={(e) => setEditTopic(e.target.value)}
                placeholder="e.g. React & Supabase"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingSession(null)}
                disabled={updatingSession}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={updatingSession || !editTitle.trim()}>
                {updatingSession ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
