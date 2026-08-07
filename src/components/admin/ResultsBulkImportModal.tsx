import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, ArrowRight, Loader2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ResultsBulkImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hackathonId: string;
  hackathonTitle: string;
  onSuccess: () => void;
};

export function ResultsBulkImportModal({
  open,
  onOpenChange,
  hackathonId,
  hackathonTitle,
  onSuccess,
}: ResultsBulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [busy, setBusy] = useState(false);

  // Column Mappings
  const [regCol, setRegCol] = useState<string>("");
  const [prizeCol, setPrizeCol] = useState<string>("");
  const [pointsCol, setPointsCol] = useState<string>("none");

  function resetState() {
    setFile(null);
    setHeaders([]);
    setRawRows([]);
    setRegCol("");
    setPrizeCol("");
    setPointsCol("none");
  }

  async function handleFileSelect(selectedFile: File) {
    try {
      const XLSX = await import("xlsx");
      const buf = await selectedFile.arrayBuffer();
      const wb = XLSX.read(buf);
      const firstSheetName = wb.SheetNames[0];
      if (!firstSheetName) {
        toast.error("Spreadsheet has no sheets");
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[firstSheetName]!, {
        defval: "",
      });

      if (!rows.length) {
        toast.error("Spreadsheet is empty");
        return;
      }

      const detectedHeaders = Object.keys(rows[0] ?? {});
      setHeaders(detectedHeaders);
      setRawRows(rows);
      setFile(selectedFile);

      // Auto-match headers
      let matchedReg = "";
      let matchedPrize = "";
      let matchedPoints = "none";

      for (const h of detectedHeaders) {
        const lower = h.toLowerCase().trim();
        if (!matchedReg && (lower.includes("reg") || lower.includes("roll") || lower.includes("htno") || lower.includes("email") || lower.includes("id"))) {
          matchedReg = h;
        } else if (!matchedPrize && (lower.includes("prize") || lower.includes("rank") || lower.includes("placement") || lower.includes("position") || lower.includes("award"))) {
          matchedPrize = h;
        } else if (matchedPoints === "none" && (lower.includes("point") || lower.includes("score") || lower.includes("mark"))) {
          matchedPoints = h;
        }
      }

      if (!matchedReg && detectedHeaders[0]) matchedReg = detectedHeaders[0];
      if (!matchedPrize && detectedHeaders[1]) matchedPrize = detectedHeaders[1];

      setRegCol(matchedReg);
      setPrizeCol(matchedPrize);
      setPointsCol(matchedPoints);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse spreadsheet");
    }
  }

  const allMappingsComplete = Boolean(regCol && prizeCol);

  async function handleImport() {
    if (!hackathonId) {
      toast.error("Please select a hackathon first");
      return;
    }
    if (!allMappingsComplete) {
      toast.error("Please select Registration Number and Prize/Placement columns");
      return;
    }

    setBusy(true);
    try {
      // 1. Fetch profiles to match registration_number / email -> user_id
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, registration_number, email");

      if (pErr) throw new Error(pErr.message);

      const regMap = new Map<string, string>();
      for (const p of profiles ?? []) {
        if (p.registration_number) regMap.set(p.registration_number.toLowerCase().trim(), p.id);
        if (p.email) {
          regMap.set(p.email.toLowerCase().trim(), p.id);
          const bare = p.email.split("@")[0]?.toLowerCase().trim();
          if (bare) regMap.set(bare, p.id);
        }
      }

      let successCount = 0;
      let skippedCount = 0;

      for (const row of rawRows) {
        const rawReg = String(row[regCol] ?? "").trim().toLowerCase();
        if (!rawReg) {
          skippedCount++;
          continue;
        }

        const userId = regMap.get(rawReg);
        if (!userId) {
          skippedCount++;
          continue;
        }

        const rawPrize = String(row[prizeCol] ?? "").trim();
        let placementVal: number | null = null;
        let pointsVal = 10; // Default participant points

        // Parse Prize / Rank
        const pLower = rawPrize.toLowerCase();
        if (pLower.includes("1") || pLower.includes("first") || pLower.includes("winner")) {
          placementVal = 1;
          pointsVal = 100;
        } else if (pLower.includes("2") || pLower.includes("second") || pLower.includes("runner")) {
          placementVal = 2;
          pointsVal = 75;
        } else if (pLower.includes("3") || pLower.includes("third")) {
          placementVal = 3;
          pointsVal = 50;
        }

        // Custom points override if column mapped
        if (pointsCol !== "none" && row[pointsCol] !== undefined && row[pointsCol] !== "") {
          const parsedPts = Number(row[pointsCol]);
          if (!isNaN(parsedPts)) pointsVal = parsedPts;
        }

        const { error: upsertErr } = await supabase
          .from("hackathon_results")
          .upsert(
            {
              hackathon_id: hackathonId,
              user_id: userId,
              attended: true,
              placement: placementVal,
              points: pointsVal,
            },
            { onConflict: "hackathon_id,user_id" },
          );

        if (!upsertErr) successCount++;
        else skippedCount++;
      }

      toast.success(
        `Results imported! ${successCount} student result(s) updated${skippedCount ? ` (${skippedCount} skipped/unmatched)` : ""}`,
      );

      resetState();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) {
          if (!v) resetState();
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Trophy className="h-5 w-5 text-primary" />
            Upload Results Spreadsheet (.xlsx, .csv)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload CSV/Excel containing Registration Numbers and Prizes/Ranks for <strong className="text-foreground">{hackathonTitle}</strong>.
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <div className="my-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/20 p-6 text-center hover:bg-secondary/40">
            <FileSpreadsheet className="h-10 w-10 text-primary opacity-80" />
            <p className="mt-2 text-xs font-semibold">Choose Results File (.xlsx, .csv)</p>
            <label className="mt-3 cursor-pointer">
              <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90">
                <Upload className="h-3.5 w-3.5" /> Select File
              </span>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) void handleFileSelect(selected);
                }}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-card">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-semibold">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">{rawRows.length} rows found</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={resetState} disabled={busy} className="text-xs">
                Change
              </Button>
            </div>

            <div className="space-y-3 rounded-xl border border-border p-4 bg-card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5 text-primary" /> Map Columns
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold">Registration Number / Email Column *</Label>
                  <Select value={regCol} onValueChange={setRegCol} disabled={busy}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder="Select Reg No Column *" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Prize / Rank Column *</Label>
                  <Select value={prizeCol} onValueChange={setPrizeCol} disabled={busy}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder="Select Prize / Rank Column *" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Points Column (Optional)</Label>
                  <Select value={pointsCol} onValueChange={setPointsCol} disabled={busy}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder="Auto-assign based on rank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Auto-assign (1st: 100pt, 2nd: 75pt, 3rd: 50pt, Part: 10pt) —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          {file ? (
            <Button size="sm" onClick={() => void handleImport()} disabled={busy || !allMappingsComplete}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
              Import & Publish Results ({rawRows.length} Rows)
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
