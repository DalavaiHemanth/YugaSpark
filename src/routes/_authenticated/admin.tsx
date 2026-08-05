import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ADMIN_NAV, SECTION_KEYS, type SectionKey } from "@/lib/admin-nav";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  adminCreateStudents,
  adminDeleteUser,
  adminSetPassword,
  STUDENT_DEFAULT_PASSWORD,
} from "@/lib/club.functions";
import { openUserFile, downloadUserFile, signedUrl } from "@/lib/storage";
import { AppShell, EmptyState } from "@/components/AppShell";
import {
  Users,
  Mail,
  CalendarPlus,
  Trophy,
  BarChart3,
  BookOpen,
  Megaphone,
  Inbox,
  Lock,
  KeyRound,
  Trash2,
  UserCheck,
  UserX,
  Pencil,
  CalendarDays,
  MapPin,
  Upload,
  ScrollText,
  FileText,
  Image,
  Download,
  ExternalLink,
} from "lucide-react";
import { Stethoscope } from "lucide-react";
import { QrScannerModal } from "@/components/admin/QrScannerModal";
import { SystemChecksPanel } from "@/components/admin/SystemChecksPanel";
import { AdminSearch, type SearchHit } from "@/components/admin/AdminSearch";
import { ResultsPanel } from "@/components/admin/ResultsPanel";
import { ResourcesPanel } from "@/components/admin/ResourcesPanel";
import { NoticesPanel } from "@/components/admin/NoticesPanel";
import { InboxPanel } from "@/components/admin/InboxPanel";
import { MailPanel } from "@/components/admin/MailPanel";
import { InsightsPanel } from "@/components/admin/InsightsPanel";
import { Button } from "@/components/ui/button";
import { AuditPanel } from "@/components/admin/AuditPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { announceHackathon, emailAllMembers } from "@/lib/notify";
import { SaturdayAttendancePanel } from "@/components/admin/SaturdayAttendancePanel";
import { BatchesPanel } from "@/components/admin/BatchesPanel";
import { EmailLogPanel } from "@/components/admin/EmailLogPanel";
import { DomainPanel } from "@/components/admin/DomainPanel";

const TITLE = "Admin console — Yuga Spark";
const DESCRIPTION = "Manage Yuga Spark members, hackathons and club access settings.";
const DOMAIN = "@rgmcet.edu.in";

const RENDERERS: Record<SectionKey, (query?: string) => React.ReactNode> = {
  members: (query) => <MembersPanel initialQuery={query} />,
  batches: () => <BatchesPanel />,
  saturday_attendance: () => <SaturdayAttendancePanel />,
  mail: () => <MailPanel />,
  emaillog: () => <EmailLogPanel />,
  domains: () => <DomainPanel />,
  inbox: () => <InboxPanel />,
  hackathons: (query) => <HackathonsPanel initialQuery={query} />,
  results: () => <ResultsPanel />,
  insights: () => <InsightsPanel />,
  playbook: () => <ResourcesPanel />,
  notices: () => <NoticesPanel />,
  access: () => <AccessPanel />,
  audit: () => <AuditPanel />,
  checks: () => <SystemChecksPanel />,
};

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => {
    const section = String(search['section'] ?? "");
    return { section: (SECTION_KEYS as string[]).includes(section) ? (section as SectionKey) : undefined };
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, isOwner, loading, profile } = useAuth();

  if (loading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <EmptyState
          icon={Lock}
          title="Admins only"
          description="This console is restricted to Yuga Spark club admins. If you think this is a mistake, message an admin from the Ask admin page."
        />
      </AppShell>
    );
  }

  return (
    <AppShell wide>
      <AdminWorkspace />
    </AppShell>
  );
}

function AdminWorkspace() {
  const { isOwner } = useAuth();
  const navigate = useNavigate();
  const { section } = Route.useSearch();
  const active: SectionKey = section ?? "members";
  const setActive = (key: SectionKey) =>
    navigate({ to: "/admin", search: { section: key }, replace: true });
  const [seed, setSeed] = useState<{ key: SectionKey; query: string } | null>(null);
  const groups = ADMIN_NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => isOwner || !i.ownerOnly),
  })).filter((g) => g.items.length > 0);
  const allItems = groups.flatMap((g) => g.items);
  const current = allItems.find((i) => i.key === active) ?? allItems[0]!;
  const Icon = current.icon;
  const query = seed && seed.key === current.key ? seed.query : undefined;

  function handlePick(hit: SearchHit, q: string) {
    const key: SectionKey = hit.kind === "student" ? "members" : "hackathons";
    setActive(key);
    setSeed({ key, query: hit.kind === "student" ? hit.title : q });
  }

  return (
    <>
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <AdminSearch onPick={handlePick} />
      <p className="hidden text-xs text-muted-foreground sm:block">
        Find any student by name, registration number or email — or jump straight to a hackathon.
      </p>
    </div>
    <div className="mt-4">
      <div className="sticky top-14 z-20 -mx-4 border-y border-border bg-background/95 px-4 py-2 backdrop-blur lg:hidden">
        <div className="-mx-1 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups.map((group) => (
            <div key={group.group} className="flex shrink-0 items-center gap-1.5">
              <span className="label-mono shrink-0 pl-1 pr-0.5 text-[10px] text-muted-foreground">
                {group.group}
              </span>
              {group.items.map((item) => {
                const ItemIcon = item.icon;
                const isActive = item.key === current.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActive(item.key)}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-flex min-h-9 shrink-0 snap-start items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    <ItemIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <section className="min-w-0">
        <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 sm:px-5 sm:py-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary sm:h-10 sm:w-10">
            <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-display text-base font-bold tracking-tight sm:text-lg">
              {current.title}
            </h2>
            <p className="line-clamp-2 text-xs text-muted-foreground sm:truncate sm:text-sm">
              {current.description}
            </p>
          </div>
        </header>
        <div key={`${current.key}-${query ?? ""}`} className="rise mt-4 sm:mt-5">
          {RENDERERS[current.key](query)}
        </div>
      </section>
    </div>
    </>
  );
}

function MembersPanel({ initialQuery }: { initialQuery?: string | undefined }) {
  return <MembersPanelInner initialQuery={initialQuery} />;
}


function MembersPanelInner({ initialQuery }: { initialQuery?: string | undefined }) {
  const { isOwner } = useAuth();
  const [emails, setEmails] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState(initialQuery ?? "");
  const [filter, setFilter] = useState<"all" | "complete" | "pending" | "inactive">("all");
  const [sort, setSort] = useState<"recent" | "name" | "year">("recent");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkPwd, setBulkPwd] = useState(STUDENT_DEFAULT_PASSWORD);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setQ(initialQuery);
      setFilter("all");
    }
  }, [initialQuery]);

  const members = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  async function createFromList(list: string[]) {
    const clean = Array.from(new Set(list.map((e) => e.trim().toLowerCase()).filter(Boolean)));
    if (clean.length === 0) {
      toast.error("No valid emails found");
      return;
    }
    setBusy(true);
    try {
      const res = await adminCreateStudents({ data: { emails: clean } });
      toast.success(
        `${res.created} created · ${res.existed} already existed${res.failed.length ? ` · ${res.failed.length} failed` : ""}`,
      );
      setEmails("");
      await members.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  function normalize(raw: string) {
    const v = String(raw).trim().toLowerCase();
    if (!v) return "";
    return v.includes("@") ? v : `${v}${DOMAIN}`;
  }

  async function importSheet(file: File) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const found: string[] = [];
    for (const name of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name]!, {
        header: 1,
        defval: "",
      }) as unknown as unknown[][];
      for (const row of rows) {
        for (const cell of row) {
          const value = String(cell ?? "").trim();
          if (!value) continue;
          if (value.includes("@") || /^[a-z0-9._-]{3,}$/i.test(value)) {
            const email = normalize(value);
            if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) found.push(email);
          }
        }
      }
    }
    await createFromList(found);
  }

  const [batchFilter, setBatchFilter] = useState("all");
  const [bulkBatchVal, setBulkBatchVal] = useState("");

  async function exportMembersToExcel() {
    try {
      const XLSX = await import("xlsx");
      const rows = (members.data ?? []).map((m) => ({
        "Full Name": m.full_name || "—",
        Email: m.email,
        "Registration Number": m.registration_number || "—",
        Batch: m.batch || "—",
        Year: m.year || "—",
        "Personal Email": m.personal_email || "—",
        Status: !m.is_active ? "Inactive" : m.profile_completed ? "Complete" : "Pending",
        "Profile Completed": m.profile_completed ? "Yes" : "No",
        "Has Photo": m.photo_url ? "Yes" : "No",
        "Has Resume": m.resume_url ? "Yes" : "No",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Members");
      XLSX.writeFile(wb, "Yuga_Spark_Members.xlsx");
      toast.success("Members exported to Excel");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  const availableBatches = Array.from(
    new Set((members.data ?? []).map((m) => m.batch).filter(Boolean)),
  ) as string[];

  const visible = (() => {
    const term = q.trim().toLowerCase();
    let rows = (members.data ?? []).filter((m) => {
      if (filter === "complete" && !m.profile_completed) return false;
      if (filter === "pending" && m.profile_completed) return false;
      if (filter === "inactive" && m.is_active) return false;
      if (batchFilter !== "all" && m.batch !== batchFilter) return false;
      if (!term) return true;
      return [m.email, m.full_name, m.registration_number, m.year, m.batch, m.personal_email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
    if (sort === "name")
      rows = [...rows].sort((a, b) => (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email));
    if (sort === "year") rows = [...rows].sort((a, b) => (a.year ?? "").localeCompare(b.year ?? ""));
    return rows;
  })();

  const selectedRows = visible.filter((m) => selected.includes(m.id));
  const allVisibleSelected = visible.length > 0 && selectedRows.length === visible.length;

  function toggleOne(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleAllVisible() {
    setSelected(allVisibleSelected ? [] : visible.map((m) => m.id));
  }

  async function bulkSetActive(active: boolean) {
    if (selectedRows.length === 0) return;
    setBulkBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: active })
      .in("id", selectedRows.map((m) => m.id));
    setBulkBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(
        `${selectedRows.length} member${selectedRows.length > 1 ? "s" : ""} ${active ? "activated" : "deactivated"}`,
      );
      setSelected([]);
      await members.refetch();
    }
  }

  async function bulkGrantAccess() {
    if (selectedRows.length === 0) return;
    setBulkBusy(true);
    const list = selectedRows.map((m) => m.email.toLowerCase());
    const { data: existing } = await supabase
      .from("allowed_emails")
      .select("email")
      .in("email", list);
    const have = new Set((existing ?? []).map((r) => r.email.toLowerCase()));
    const rows = list.filter((e) => !have.has(e)).map((email) => ({ email }));
    if (rows.length === 0) {
      setBulkBusy(false);
      toast.info("All selected members already have access");
      return;
    }
    const { error } = await supabase.from("allowed_emails").insert(rows);
    setBulkBusy(false);
    if (error) toast.error(error.message);
    else toast.success(`Access granted to ${rows.length} email${rows.length > 1 ? "s" : ""}`);
  }

  async function bulkResetPasswords() {
    if (selectedRows.length === 0) return;
    if (bulkPwd.trim().length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!confirm(`Reset the password for ${selectedRows.length} member(s)?`)) return;
    setBulkBusy(true);
    let ok = 0;
    const failed: string[] = [];
    for (const m of selectedRows) {
      try {
        await adminSetPassword({ data: { userId: m.id, password: bulkPwd.trim() } });
        ok += 1;
      } catch {
        failed.push(m.email);
      }
    }
    setBulkBusy(false);
    if (ok > 0) toast.success(`Password reset for ${ok} member${ok > 1 ? "s" : ""}`);
    if (failed.length > 0) toast.error(`Failed for ${failed.length}: ${failed.slice(0, 3).join(", ")}`);
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="surface p-5">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </span>
            <h2 className="font-display text-sm font-bold">Add members</h2>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            One roll number or email per line. Bare roll numbers get {DOMAIN} appended. Default
            password for generated accounts is{" "}
            <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">
              {STUDENT_DEFAULT_PASSWORD}
            </code>
            .
          </p>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void createFromList(emails.split("\n"));
            }}
          >
            <Textarea
              rows={5}
              value={emails}
              placeholder={`21091a0501\n21091a0502@rgmcet.edu.in`}
              onChange={(e) => setEmails(e.target.value)}
            />
            <Button type="submit" size="sm" className="w-full" disabled={busy}>
              {busy ? "Adding members…" : "Add members"}
            </Button>
          </form>
          <div className="mt-4 border-t border-border pt-4">
            <Label className="text-xs font-semibold">Bulk import spreadsheet (.xlsx, .csv)</Label>
            <Input
              type="file"
              accept=".xlsx,.csv"
              className="mt-2 text-xs"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importSheet(f);
              }}
            />
          </div>
        </div>
      </div>

      <div className="surface overflow-hidden">
        <div className="space-y-3 border-b border-border bg-secondary/30 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <label className="flex min-w-0 items-center gap-2">
              <Checkbox
                checked={allVisibleSelected}
                onCheckedChange={toggleAllVisible}
                aria-label="Select all visible members"
                disabled={visible.length === 0}
              />
              <span className="font-display text-sm font-bold">Members</span>
            </label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => void exportMembersToExcel()}
              >
                <Download className="h-3.5 w-3.5 text-primary" />
                Export Excel
              </Button>
              <Badge variant="secondary" className="font-mono text-[11px]">
                {visible.length}/{members.data?.length ?? 0}
              </Badge>
            </div>
          </div>
          <Input
            className="bg-background"
            value={q}
            placeholder="Search name, email, roll number, batch, year…"
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <div className="-mx-0.5 flex overflow-x-auto rounded-lg border border-border bg-background p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(["all", "complete", "pending", "inactive"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {availableBatches.length > 0 ? (
              <Select value={batchFilter} onValueChange={setBatchFilter}>
                <SelectTrigger className="h-8 text-xs w-[140px] bg-background">
                  <SelectValue placeholder="Batch Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {availableBatches.map((b) => (
                    <SelectItem key={b} value={b}>Batch: {b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground sm:ml-auto">
              <span>Sort</span>
              {(["recent", "name", "year"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`rounded-md px-2 py-1 capitalize transition-colors ${
                    sort === s ? "bg-secondary font-medium text-foreground" : "hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        {selectedRows.length > 0 ? (
          <div className="space-y-3 border-b border-border bg-primary/5 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="text-[11px]">{selectedRows.length} selected</Badge>
              
              <div className="flex items-center gap-1">
                <Input
                  className="h-7 w-32 bg-background text-xs"
                  placeholder="Batch e.g. 2023-2027"
                  value={bulkBatchVal}
                  onChange={(e) => setBulkBatchVal(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs"
                  disabled={bulkBusy || !bulkBatchVal.trim()}
                  onClick={() => void bulkAssignBatch(bulkBatchVal)}
                >
                  Set Batch
                </Button>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                disabled={bulkBusy}
                onClick={() => void bulkSetActive(true)}
              >
                <UserCheck className="h-3.5 w-3.5" />
                Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                disabled={bulkBusy}
                onClick={() => void bulkSetActive(false)}
              >
                <UserX className="h-3.5 w-3.5" />
                Deactivate
              </Button>
              {isOwner ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  disabled={bulkBusy}
                  onClick={() => void bulkGrantAccess()}
                >
                  <Lock className="h-3.5 w-3.5" />
                  Assign access
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                disabled={bulkBusy}
                onClick={async () => {
                  const withResumes = selectedRows.filter((m) => m.resume_url);
                  if (withResumes.length === 0) {
                    toast.info("None of the selected members have uploaded a resume");
                    return;
                  }
                  toast.info(`Downloading ${withResumes.length} resume(s)…`);
                  for (const m of withResumes) {
                    const name = m.full_name || m.registration_number || m.email;
                    await downloadUserFile("resumes", m.resume_url, name);
                  }
                }}
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                Download Resumes
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                disabled={bulkBusy}
                onClick={async () => {
                  const withPhotos = selectedRows.filter((m) => m.photo_url);
                  if (withPhotos.length === 0) {
                    toast.info("None of the selected members have uploaded a photo");
                    return;
                  }
                  toast.info(`Downloading ${withPhotos.length} photo(s)…`);
                  for (const m of withPhotos) {
                    const name = m.full_name || m.registration_number || m.email;
                    await downloadUserFile("photos", m.photo_url, name);
                  }
                }}
              >
                <Image className="h-3.5 w-3.5 text-primary" />
                Download Photos
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                disabled={bulkBusy}
                onClick={() => void bulkResetPasswords()}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Reset Passwords
              </Button>
              <button
                type="button"
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setSelected([])}
              >
                Clear
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                className="bg-background sm:max-w-56"
                value={bulkPwd}
                minLength={6}
                placeholder="New password"
                onChange={(e) => setBulkPwd(e.target.value)}
              />
            </div>
          </div>
        ) : null}
        <ul className="divide-y divide-border">
          {visible.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              selected={selected.includes(m.id)}
              onToggle={() => toggleOne(m.id)}
              onChanged={() => void members.refetch()}
            />
          ))}
          {visible.length === 0 ? (
            <li className="p-5">
              <EmptyState
                icon={Users}
                title="No members match"
                description="Try clearing your search or adding members using the form on the left."
              />
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

type MemberRowProps = {
  member: {
    id: string;
    email: string;
    full_name: string | null;
    registration_number: string | null;
    year: string | null;
    batch?: string | null;
    personal_email: string | null;
    profile_completed: boolean;
    is_active: boolean;
    photo_url: string | null;
    resume_url: string | null;
  };
  selected: boolean;
  onToggle: () => void;
  onChanged: () => void;
};

function MemberRow({ member, selected, onToggle, onChanged }: MemberRowProps) {
  const [pwd, setPwd] = useState("");
  const [open, setOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchVal, setBatchVal] = useState(member.batch ?? "");
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);
  const [downloadingResume, setDownloadingResume] = useState(false);

  useEffect(() => {
    if (member.photo_url) {
      void signedUrl("photos", member.photo_url).then(setPhotoSrc);
    } else {
      setPhotoSrc(null);
    }
  }, [member.photo_url]);

  const displayName = member.full_name || member.registration_number || member.email;
  const initials = (member.full_name ?? member.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleDownload(bucket: "photos" | "resumes") {
    const isPhoto = bucket === "photos";
    const path = isPhoto ? member.photo_url : member.resume_url;
    if (!path) return;
    if (isPhoto) setDownloadingPhoto(true);
    else setDownloadingResume(true);
    try {
      await downloadUserFile(bucket, path, displayName);
      toast.success(`${isPhoto ? "Photo" : "Resume"} downloaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      if (isPhoto) setDownloadingPhoto(false);
      else setDownloadingResume(false);
    }
  }

  async function handleView(bucket: "photos" | "resumes") {
    const path = bucket === "photos" ? member.photo_url : member.resume_url;
    if (!path) return;
    try {
      await openUserFile(bucket, path);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open file");
    }
  }

  return (
    <li className="px-4 py-4 transition-colors hover:bg-secondary/30 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <Checkbox
            className="mt-1 shrink-0"
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={`Select ${member.email}`}
          />
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={displayName}
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-[11px] font-semibold text-primary">
              {initials}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-medium">{member.full_name ?? "Unnamed member"}</p>
              <Badge variant={member.profile_completed ? "secondary" : "outline"} className="text-[10px]">
                {member.profile_completed ? "complete" : "pending"}
              </Badge>
              {member.batch ? (
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-semibold">
                  Batch: {member.batch}
                </Badge>
              ) : null}
              {!member.is_active ? (
                <Badge variant="destructive" className="text-[10px]">
                  inactive
                </Badge>
              ) : null}
            </div>
            <p className="truncate font-mono text-xs text-muted-foreground">{member.email}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {member.registration_number ?? "no reg no."} · {member.year ?? "year not set"}
              {member.personal_email ? ` · ${member.personal_email}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {member.photo_url ? (
                <div className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-xs">
                  <Image className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium text-foreground">Photo</span>
                  <button
                    type="button"
                    onClick={() => void handleView("photos")}
                    className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    title="View Photo in new tab"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    disabled={downloadingPhoto}
                    onClick={() => void handleDownload("photos")}
                    className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                    title="Download Photo"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-secondary/30 px-2 py-0.5 text-xs text-muted-foreground">
                  <Image className="h-3.5 w-3.5 opacity-50" /> No photo
                </span>
              )}

              {member.resume_url ? (
                <div className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-xs">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium text-foreground">Resume</span>
                  <button
                    type="button"
                    onClick={() => void handleView("resumes")}
                    className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    title="View Resume in new tab"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    disabled={downloadingResume}
                    onClick={() => void handleDownload("resumes")}
                    className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                    title="Download Resume"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-secondary/30 px-2 py-0.5 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5 opacity-50" /> No resume
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs text-primary"
            onClick={() => setBatchOpen((v) => !v)}
          >
            <Pencil className="h-3.5 w-3.5" />
            {member.batch ? `Batch: ${member.batch}` : "Set Batch"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title={member.is_active ? "Deactivate member" : "Activate member"}
            className="gap-1.5 text-xs"
            onClick={async () => {
              const { error } = await supabase
                .from("profiles")
                .update({ is_active: !member.is_active })
                .eq("id", member.id);
              if (error) toast.error(error.message);
              else {
                toast.success(member.is_active ? "Member deactivated" : "Member reactivated");
                onChanged();
              }
            }}
          >
            {member.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
            {member.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs"
            onClick={() => setOpen((v) => !v)}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Password
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete member"
            onClick={async () => {
              if (!confirm(`Delete ${member.email}? This cannot be undone.`)) return;
              try {
                await adminDeleteUser({ data: { userId: member.id } });
                toast.success("Member removed");
                onChanged();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Delete failed");
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {batchOpen ? (
        <form
          className="mt-3 flex gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const { error } = await supabase
              .from("profiles")
              .update({ batch: batchVal.trim() || null })
              .eq("id", member.id);
            if (error) toast.error(error.message);
            else {
              setBatchOpen(false);
              toast.success("Batch updated");
              onChanged();
            }
          }}
        >
          <Input
            type="text"
            value={batchVal}
            placeholder="Assign Batch (e.g. 2023-2027)"
            onChange={(e) => setBatchVal(e.target.value)}
          />
          <Button size="sm" type="submit">
            Save Batch
          </Button>
        </form>
      ) : null}
      {open ? (
        <form
          className="mt-3 flex gap-2 rounded-lg border border-border bg-secondary/40 p-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await adminSetPassword({ data: { userId: member.id, password: pwd } });
              setPwd("");
              setOpen(false);
              toast.success("Password updated");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not set password");
            }
          }}
        >
          <Input
            type="text"
            minLength={6}
            required
            value={pwd}
            placeholder="New password"
            onChange={(e) => setPwd(e.target.value)}
          />
          <Button size="sm" type="submit">
            Set
          </Button>
        </form>
      ) : null}
    </li>
  );
}

function HackathonsPanel({ initialQuery }: { initialQuery?: string | undefined }) {
  const { user } = useAuth();
  const [scanHackathon, setScanHackathon] = useState<{ id: string; title: string } | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    venue: "",
    event_date: "",
    start_time: "",
    end_time: "",
    team_min: 2,
    team_max: 4,
    mode: "offline",
    registration_deadline: "",
    banner_url: "",
  });
  const [busy, setBusy] = useState(false);

  const hackathons = useQuery({
    queryKey: ["admin-hackathons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hackathons")
        .select("*")
        .order("event_date", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const needle = (initialQuery ?? "").trim().toLowerCase();
  const visibleHackathons = (hackathons.data ?? []).filter((h) =>
    needle
      ? h.title.toLowerCase().includes(needle) || (h.venue ?? "").toLowerCase().includes(needle)
      : true,
  );

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (form.team_min > form.team_max) {
      toast.error("Minimum team size cannot exceed the maximum");
      return;
    }
    setBusy(true);
    const record = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      venue: form.venue.trim() || null,
      event_date: form.event_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      team_min: Number(form.team_min),
      team_max: Number(form.team_max),
      mode: form.mode,
      registration_deadline: form.registration_deadline
        ? new Date(form.registration_deadline).toISOString()
        : null,
      banner_url: form.banner_url.trim() || null,
      created_by: user.id,
    };
    const { error } = await supabase.from("hackathons").insert(record);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      const noticeError = await announceHackathon(record, user.id);
      if (noticeError) toast.warning(`Published, but the notice failed: ${noticeError}`);
      else toast.success("Hackathon published and announced on the notice board");
      const mail = await emailAllMembers({
        subject: `New hackathon: ${record.title}`,
        kind: "announcement",
        body: [
          `Hi {{first_name}},`,
          `${record.title} is now open on Yuga Spark.`,
          [
            `Date: ${new Date(record.event_date).toDateString()}`,
            record.start_time ? `Time: ${record.start_time.slice(0, 5)}` : null,
            record.venue ? `Venue: ${record.venue}` : null,
            `Mode: ${record.mode}`,
            `Team size: ${record.team_min}–${record.team_max}`,
            record.registration_deadline
              ? `Register before: ${new Date(record.registration_deadline).toLocaleString()}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
          `Sign in to your dashboard to register and find a squad.`,
          `— Yuga Spark`,
        ].join("\n\n"),
      });
      if (mail && !mail.skipped) {
        toast.success(`Emailed ${mail.sent} member(s)${mail.failed ? `, ${mail.failed} failed` : ""}`);
      }
      setForm({
        title: "",
        description: "",
        venue: "",
        event_date: "",
        start_time: "",
        end_time: "",
        team_min: 2,
        team_max: 4,
        mode: "offline",
        registration_deadline: "",
        banner_url: "",
      });
      void hackathons.refetch();
    }
  }

  return (
    <div className="space-y-6">
      {scanHackathon ? (
        <QrScannerModal
          hackathonId={scanHackathon.id}
          hackathonTitle={scanHackathon.title}
          onClose={() => setScanHackathon(null)}
          onSuccess={() => void hackathons.refetch()}
        />
      ) : null}

      <form onSubmit={create} className="surface space-y-4 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <CalendarPlus className="h-4 w-4" />
          </span>
          <h2 className="font-display text-sm font-bold">New hackathon</h2>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="event_date">Date</Label>
            <Input
              id="event_date"
              type="date"
              required
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start_time">Start</Label>
            <Input
              id="start_time"
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_time">End</Label>
            <Input
              id="end_time"
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="team_min">Min team</Label>
            <Input
              id="team_min"
              type="number"
              min={1}
              max={10}
              required
              value={form.team_min}
              onChange={(e) => setForm({ ...form, team_min: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team_max">Max team</Label>
            <Input
              id="team_max"
              type="number"
              min={1}
              max={10}
              required
              value={form.team_max}
              onChange={(e) => setForm({ ...form, team_max: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mode">Mode</Label>
            <select
              id="mode"
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="offline">Offline</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Registration deadline</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={form.registration_deadline}
              onChange={(e) => setForm({ ...form, registration_deadline: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="banner">Banner image URL (optional)</Label>
          <Input
            id="banner"
            type="url"
            value={form.banner_url}
            placeholder="https://…"
            onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Publishing…" : "Publish hackathon"}
        </Button>
      </form>

      <div className="surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/30 px-4 py-3.5 sm:px-5">
          <h2 className="font-display text-sm font-bold">
            {initialQuery ? `Matching “${initialQuery}”` : "All hackathons"}
          </h2>
          <Badge variant="secondary" className="font-mono text-[11px]">
            {visibleHackathons.length}
          </Badge>
        </div>
        <ul className="divide-y divide-border">
          {visibleHackathons.map((h) => (
            <HackathonRow
              key={h.id}
              hackathon={h}
              onChanged={() => void hackathons.refetch()}
              onScanQr={() => setScanHackathon({ id: h.id, title: h.title })}
            />
          ))}
          {visibleHackathons.length === 0 ? (
            <li className="p-5">
              <EmptyState
                icon={CalendarPlus}
                title="No hackathons match"
                description="Try clearing your search or publish a new hackathon above."
              />
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

function AccessPanel() {
  return <AccessPanelInner />;
}

type HackathonRowProps = {
  hackathon: {
    id: string;
    title: string;
    event_date: string;
    start_time: string | null;
    end_time: string | null;
    venue: string | null;
    team_min: number;
    team_max: number;
    mode: string;
    registration_open: boolean;
  };
  onChanged: () => void;
  onScanQr: () => void;
};

function HackathonRow({ hackathon: h, onChanged, onScanQr }: HackathonRowProps) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState({
    title: h.title,
    event_date: h.event_date,
    start_time: h.start_time ?? "",
    end_time: h.end_time ?? "",
    venue: h.venue ?? "",
    team_min: h.team_min,
    team_max: h.team_max,
    mode: h.mode,
  });

  async function save() {
    if (draft.team_min > draft.team_max) {
      toast.error("Minimum team size cannot exceed the maximum");
      return;
    }
    const { error } = await supabase
      .from("hackathons")
      .update({
        title: draft.title.trim(),
        event_date: draft.event_date,
        start_time: draft.start_time || null,
        end_time: draft.end_time || null,
        venue: draft.venue.trim() || null,
        team_min: Number(draft.team_min),
        team_max: Number(draft.team_max),
        mode: draft.mode,
      })
      .eq("id", h.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Hackathon updated");
      setEdit(false);
      onChanged();
    }
  }

  return (
    <li className="px-4 py-4 transition-colors hover:bg-secondary/30 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{h.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date(h.event_date).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {h.venue ?? "venue TBA"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {h.team_min}–{h.team_max}
            </span>
            <Badge variant="outline" className="text-[10px] capitalize">
              {h.mode}
            </Badge>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
            onClick={onScanQr}
          >
            <QrCode className="h-3.5 w-3.5" />
            Scan QR
          </Button>
          <span className="text-xs text-muted-foreground">Reg</span>
          <Switch
            checked={h.registration_open}
            onCheckedChange={async (v) => {
              const { error } = await supabase
                .from("hackathons")
                .update({ registration_open: v })
                .eq("id", h.id);
              if (error) toast.error(error.message);
              else onChanged();
            }}
          />
          <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={() => setEdit((v) => !v)}>
            <Pencil className="h-3.5 w-3.5" />
            {edit ? "Cancel" : "Edit"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Delete hackathon"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={async () => {
              if (!confirm(`Delete "${h.title}"?`)) return;
              const { error } = await supabase.from("hackathons").delete().eq("id", h.id);
              if (error) toast.error(error.message);
              else onChanged();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {edit ? (
        <div className="mt-4 grid gap-3 rounded-lg border border-border bg-secondary/40 p-3 sm:grid-cols-2">
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Title"
          />
          <Input
            type="date"
            value={draft.event_date}
            onChange={(e) => setDraft({ ...draft, event_date: e.target.value })}
          />
          <Input
            type="time"
            value={draft.start_time}
            onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
          />
          <Input
            type="time"
            value={draft.end_time}
            onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
          />
          <Input
            value={draft.venue}
            placeholder="Venue"
            onChange={(e) => setDraft({ ...draft, venue: e.target.value })}
          />
          <select
            value={draft.mode}
            onChange={(e) => setDraft({ ...draft, mode: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="offline">Offline</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
          </select>
          <Input
            type="number"
            min={1}
            value={draft.team_min}
            onChange={(e) => setDraft({ ...draft, team_min: Number(e.target.value) })}
          />
          <Input
            type="number"
            min={1}
            value={draft.team_max}
            onChange={(e) => setDraft({ ...draft, team_max: Number(e.target.value) })}
          />
          <Button size="sm" onClick={save}>
            Save changes
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function AccessPanelInner() {
  const setting = useQuery({
    queryKey: ["access-mode"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "access_mode")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.value ?? "open";
    },
  });

  const open = setting.data === "open";

  return (
    <div className="surface max-w-xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Lock className="h-4 w-4" />
        </span>
        <h2 className="font-display text-sm font-bold">Who can join the club portal</h2>
      </div>
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            {open ? "Open to any email" : "Invite-only"}
            <Badge variant={open ? "secondary" : "default"} className="text-[10px]">
              {open ? "open" : "restricted"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {open
              ? "Anyone with any email address can create an account."
              : "Only emails added by an admin (individually or by Excel import) can create an account."}
          </p>
        </div>
        <Switch
          checked={open}
          onCheckedChange={async (v) => {
            const { error } = await supabase
              .from("app_settings")
              .upsert({ key: "access_mode", value: v ? "open" : "restricted" }, { onConflict: "key" });
            if (error) toast.error(error.message);
            else {
              toast.success(v ? "Access opened to all emails" : "Access restricted to added emails");
              await setting.refetch();
            }
          }}
        />
      </div>
    </div>
  );
}