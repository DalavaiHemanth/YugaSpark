import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Download, QrCode, FileSpreadsheet, Upload, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { announceResults, emailAttendees } from "@/lib/notify";
import { QrScannerModal } from "@/components/admin/QrScannerModal";
import { ResultsBulkImportModal } from "@/components/admin/ResultsBulkImportModal";
import { CertificateConfigModal } from "@/components/admin/CertificateConfigModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Row = { attended: boolean; placement: string; points: string };

export function ResultsPanel() {
  const { user } = useAuth();
  const [hid, setHid] = useState("");
  const [draft, setDraft] = useState<Record<string, Row>>({});
  const [announcing, setAnnouncing] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);

  const hackathons = useQuery({
    queryKey: ["hackathons-admin-results"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hackathons")
        .select("id, title, event_date, certificate_mode")
        .order("event_date", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const selectedHackathon = (hackathons.data ?? []).find((h) => h.id === hid);
  const isCertEnabled = selectedHackathon?.certificate_mode !== "off";

  async function toggleCertificateIssuance(enabled: boolean) {
    if (!hid) return;
    const nextMode = enabled ? "auto" : "off";
    const { error } = await supabase
      .from("hackathons")
      .update({ certificate_mode: nextMode })
      .eq("id", hid);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(enabled ? "Certificate issuing ENABLED for this event" : "Certificate issuing DISABLED for this event");
    void hackathons.refetch();
  }

  const members = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .order("full_name");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const results = useQuery({
    queryKey: ["results", hid],
    enabled: Boolean(hid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hackathon_results")
        .select("*")
        .eq("hackathon_id", hid);
      if (error) throw new Error(error.message);
      return data;
    },
  });

  function rowFor(userId: string): Row {
    if (draft[userId]) return draft[userId];
    const existing = results.data?.find((r) => r.user_id === userId);
    return {
      attended: existing?.attended ?? false,
      placement: existing?.placement != null ? String(existing.placement) : "",
      points: existing ? String(existing.points) : "",
    };
  }

  function patch(userId: string, next: Partial<Row>) {
    setDraft((d) => ({ ...d, [userId]: { ...rowFor(userId), ...next } }));
  }

  async function save(userId: string) {
    if (!hid) return;
    const row = rowFor(userId);
    const existing = results.data?.find((r) => r.user_id === userId);
    const payload = {
      hackathon_id: hid,
      user_id: userId,
      attended: row.attended,
      placement: row.placement ? Number(row.placement) : null,
      points: row.points ? Number(row.points) : 0,
    };
    const { error } = existing
      ? await supabase.from("hackathon_results").update(payload).eq("id", existing.id)
      : await supabase.from("hackathon_results").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Result saved");
    void results.refetch();
  }

  async function exportResultsToExcel() {
    if (!hid) return;
    const title = selectedHackathon?.title || "Results";
    try {
      const XLSX = await import("xlsx");
      const rows = (members.data ?? []).map((m) => {
        const row = rowFor(m.id);
        return {
          "Full Name": m.full_name || "—",
          Email: m.email,
          Attended: row.attended ? "Yes" : "No",
          Placement: row.placement ? `Rank ${row.placement}` : "—",
          "Points Awarded": row.points || "0",
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Results");
      XLSX.writeFile(wb, `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}_Results.xlsx`);
      toast.success("Results exported to Excel");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  async function announce() {
    if (!hid || !user) return;
    const title = selectedHackathon?.title;
    if (!title) return;
    setAnnouncing(true);
    const error = await announceResults(title, user.id);
    if (error) toast.error(error);
    else toast.success("Members notified on the notice board");
    const mail = await emailAttendees(
      hid,
      `Results out: ${title}`,
      [
        "Hi {{first_name}},",
        `Results for ${title} are published.`,
        "Placements and points are live on the leaderboard, and your certificate is ready to download from the Certificates page.",
        "Thanks for taking part.",
        "— Yuga Spark",
      ].join("\n\n"),
    );
    setAnnouncing(false);
    if (mail && !mail.skipped) {
      toast.success(`Emailed ${mail.sent} attendee(s)${mail.failed ? `, ${mail.failed} failed` : ""}`);
    }
  }

  async function uploadCertificate(userId: string, file: File) {
    if (!hid) return;
    const path = `${hid}/${userId}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error: upErr } = await supabase.storage.from("certificates").upload(path, file, {
      upsert: true,
    });
    if (upErr) {
      toast.error(upErr.message);
      return;
    }
    const existing = results.data?.find((r) => r.user_id === userId);
    const { error } = existing
      ? await supabase.from("hackathon_results").update({ certificate_url: path }).eq("id", existing.id)
      : await supabase
          .from("hackathon_results")
          .insert({ hackathon_id: hid, user_id: userId, attended: true, certificate_url: path });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Certificate uploaded");
    void results.refetch();
  }

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {showQrScanner && selectedHackathon ? (
        <QrScannerModal
          hackathonId={selectedHackathon.id}
          hackathonTitle={selectedHackathon.title}
          onClose={() => setShowQrScanner(false)}
          onSuccess={() => void results.refetch()}
        />
      ) : null}

      <div className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Label className="text-base font-bold">Hackathon</Label>
            <p className="text-xs text-muted-foreground">Pick a hackathon to record results and customize certificates</p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfigModalOpen(true)}
            className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 font-semibold"
          >
            <Palette className="h-4 w-4" />
            Customize Certificate Format
          </Button>
        </div>

        <Select value={hid} onValueChange={(v) => { setHid(v); setDraft({}); }}>
          <SelectTrigger className="mt-3 w-full max-w-md">
            <SelectValue placeholder="Pick a hackathon to record results" />
          </SelectTrigger>
          <SelectContent>
            {(hackathons.data ?? []).map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-3 text-sm text-muted-foreground">
          Mark attendance, set placement (1–3 counts as a win) and award points. Upload a CSV spreadsheet containing Registration Numbers and Prizes/Ranks to bulk import results. Certificates unlock automatically for all attended members when enabled.
        </p>

        {hid ? (
          <div className="mt-4 rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Certificate Issuance
                  </Label>
                  <Badge
                    variant={isCertEnabled ? "default" : "secondary"}
                    className="text-[10px] font-bold"
                  >
                    {isCertEnabled ? "ON (Issuing Enabled)" : "OFF (Disabled)"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {isCertEnabled
                    ? "Attended members can download their auto-generated HTML5 Canvas certificates."
                    : "Certificate downloads for this event are currently disabled by admins."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="cert-issuance-toggle"
                  checked={isCertEnabled}
                  onCheckedChange={(c) => void toggleCertificateIssuance(c)}
                />
                <Label htmlFor="cert-issuance-toggle" className="text-xs font-semibold cursor-pointer">
                  {isCertEnabled ? "ON" : "OFF"}
                </Label>
              </div>
            </div>
          </div>
        ) : null}

        {hid ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setShowQrScanner(true)}
            >
              <QrCode className="h-4 w-4" />
              Scan QR Attendance
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 font-semibold"
              onClick={() => setImportModalOpen(true)}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Upload Results CSV (.xlsx, .csv)
            </Button>
            <Button size="sm" onClick={announce} disabled={announcing}>
              {announcing ? "Announcing…" : "Announce results to members"}
            </Button>
            <Button size="sm" variant="outline" onClick={exportResultsToExcel} className="gap-1.5">
              <Download className="h-3.5 w-3.5 text-primary" />
              Export Results to Excel
            </Button>
          </div>
        ) : null}

        <ResultsBulkImportModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          hackathonId={hid}
          hackathonTitle={selectedHackathon?.title || "Hackathon"}
          onSuccess={() => void results.refetch()}
        />

        <CertificateConfigModal
          open={configModalOpen}
          onOpenChange={setConfigModalOpen}
        />
      </div>

      {hid ? (
        <div className="surface divide-y divide-border overflow-hidden">
          {(members.data ?? []).map((m) => {
            const row = rowFor(m.id);
            return (
              <div key={m.id} className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
                <div className="w-full min-w-0 sm:w-auto sm:min-w-[200px] sm:flex-1">
                  <p className="text-sm font-medium">{m.full_name ?? m.email}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={row.attended}
                    onCheckedChange={(v) => patch(m.id, { attended: v })}
                  />
                  Attended
                </label>
                <Input
                  className="w-24"
                  placeholder="Rank"
                  value={row.placement}
                  onChange={(e) => patch(m.id, { placement: e.target.value })}
                />
                <Input
                  className="w-24"
                  placeholder="Points"
                  value={row.points}
                  onChange={(e) => patch(m.id, { points: e.target.value })}
                />
                <Button size="sm" onClick={() => save(m.id)}>
                  Save
                </Button>
                <label className="cursor-pointer text-xs text-primary underline-offset-2 hover:underline">
                  Upload cert
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadCertificate(m.id, f);
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
