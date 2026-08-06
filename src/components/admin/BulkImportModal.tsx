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
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { adminImportStudentsWithProfiles, type StudentImportItem } from "@/lib/club.functions";

type BulkImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchOptions: string[];
  activeBatchName: string;
  onSuccess: () => void;
};

export function BulkImportModal({
  open,
  onOpenChange,
  batchOptions,
  activeBatchName,
  onSuccess,
}: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [busy, setBusy] = useState(false);

  // Column Mappings
  const [emailCol, setEmailCol] = useState<string>("");
  const [nameCol, setNameCol] = useState<string>("none");
  const [regCol, setRegCol] = useState<string>("none");
  const [yearCol, setYearCol] = useState<string>("none");
  const [batchCol, setBatchCol] = useState<string>("none");

  // Default fallback batch if column not mapped or cell empty
  const [fallbackBatch, setFallbackBatch] = useState<string>(activeBatchName || "2023-2027");

  function resetState() {
    setFile(null);
    setHeaders([]);
    setRawRows([]);
    setEmailCol("");
    setNameCol("none");
    setRegCol("none");
    setYearCol("none");
    setBatchCol("none");
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

      // Smart Auto-Matching logic
      let matchedEmail = "";
      let matchedName = "none";
      let matchedReg = "none";
      let matchedYear = "none";
      let matchedBatch = "none";

      for (const h of detectedHeaders) {
        const lower = h.toLowerCase().trim();
        if (!matchedEmail && (lower.includes("email") || lower.includes("roll") || lower.includes("htno") || lower.includes("reg") || lower.includes("id"))) {
          matchedEmail = h;
        } else if (matchedName === "none" && (lower.includes("name") || lower.includes("student"))) {
          matchedName = h;
        } else if (matchedReg === "none" && (lower.includes("reg") || lower.includes("roll") || lower.includes("number") || lower.includes("id"))) {
          matchedReg = h;
        } else if (matchedYear === "none" && (lower.includes("year") || lower.includes("sem") || lower.includes("class"))) {
          matchedYear = h;
        } else if (matchedBatch === "none" && (lower.includes("batch") || lower.includes("sec") || lower.includes("group"))) {
          matchedBatch = h;
        }
      }

      if (!matchedEmail && detectedHeaders[0]) {
        matchedEmail = detectedHeaders[0];
      }

      setEmailCol(matchedEmail);
      setNameCol(matchedName);
      setRegCol(matchedReg);
      setYearCol(matchedYear);
      setBatchCol(matchedBatch);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse spreadsheet");
    }
  }

  async function handleImport() {
    if (!emailCol) {
      toast.error("Please select a column for Email / Roll Number");
      return;
    }

    setBusy(true);
    try {
      const studentsToImport: StudentImportItem[] = rawRows
        .map((row) => {
          const rawEmail = String(row[emailCol] ?? "").trim();
          if (!rawEmail) return null;

          const fullName = nameCol !== "none" ? String(row[nameCol] ?? "").trim() : null;
          const regNo = regCol !== "none" ? String(row[regCol] ?? "").trim() : null;
          const yearVal = yearCol !== "none" ? String(row[yearCol] ?? "").trim() : null;
          const batchVal = batchCol !== "none" ? String(row[batchCol] ?? "").trim() : null;

          return {
            email: rawEmail,
            full_name: fullName || null,
            registration_number: regNo || null,
            year: yearVal || null,
            batch: batchVal || fallbackBatch,
          };
        })
        .filter((s): s is StudentImportItem => s !== null);

      if (!studentsToImport.length) {
        toast.error("No valid member rows found in the selected Email column");
        setBusy(false);
        return;
      }

      const res = await adminImportStudentsWithProfiles({
        data: { students: studentsToImport },
      });

      toast.success(
        `Import complete! ${res.created} created · ${res.updated} updated${res.failed.length ? ` · ${res.failed.length} failed` : ""}`,
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

  // Preview of mapped data (first 4 rows)
  const previewRows = rawRows.slice(0, 4).map((row) => {
    const rawEmail = emailCol ? String(row[emailCol] ?? "").trim() : "—";
    const formattedEmail = rawEmail && !rawEmail.includes("@") ? `${rawEmail}@rgmcet.edu.in` : rawEmail;
    return {
      email: formattedEmail || "—",
      name: nameCol !== "none" ? String(row[nameCol] ?? "").trim() || "—" : "—",
      regNo: regCol !== "none" ? String(row[regCol] ?? "").trim() || "—" : "—",
      year: yearCol !== "none" ? String(row[yearCol] ?? "").trim() || "—" : "—",
      batch: batchCol !== "none" ? String(row[batchCol] ?? "").trim() || fallbackBatch : fallbackBatch,
    };
  });

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Bulk Import Members & Map Columns
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload an Excel or CSV file. Map spreadsheet columns to Student Name, Registration Number, Year, and Batch.
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <div className="my-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/20 p-8 text-center transition-colors hover:bg-secondary/40">
            <FileSpreadsheet className="h-12 w-12 text-primary opacity-80" />
            <p className="mt-3 text-sm font-semibold">Choose your spreadsheet file</p>
            <p className="text-xs text-muted-foreground">Supports .xlsx, .xls, and .csv formats</p>
            <label className="mt-4 cursor-pointer">
              <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90">
                <Upload className="h-4 w-4" /> Browse File
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
          <div className="space-y-5">
            {/* File Info Bar */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {rawRows.length} member rows found · {headers.length} columns
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={resetState}
                disabled={busy}
              >
                Change File
              </Button>
            </div>

            {/* Column Mapping Selectors */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5 text-primary" />
                Step 1: Map Spreadsheet Columns
              </h3>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {/* Email / Roll No Column (Required) */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Email / Roll No <span className="text-destructive">*</span></span>
                    <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary">Required</Badge>
                  </Label>
                  <Select value={emailCol} onValueChange={setEmailCol} disabled={busy}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Select Email Column" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Full Name Column */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Student Name Column</Label>
                  <Select value={nameCol} onValueChange={setNameCol} disabled={busy}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Select Name Column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Don't import Name —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Registration Number Column */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Registration No. Column</Label>
                  <Select value={regCol} onValueChange={setRegCol} disabled={busy}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Select Reg No Column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Don't import Reg No —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year Column */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Academic Year Column</Label>
                  <Select value={yearCol} onValueChange={setYearCol} disabled={busy}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Select Year Column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Don't import Year —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Batch Column */}
                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Batch Column</Label>
                    <span className="text-[11px] text-muted-foreground">Fallback Batch if empty:</span>
                  </div>
                  <div className="flex gap-2">
                    <Select value={batchCol} onValueChange={setBatchCol} disabled={busy}>
                      <SelectTrigger className="h-8 text-xs bg-background flex-1">
                        <SelectValue placeholder="Select Batch Column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Use Fallback Batch for All —</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={fallbackBatch} onValueChange={setFallbackBatch} disabled={busy}>
                      <SelectTrigger className="h-8 text-xs w-36 bg-background">
                        <SelectValue placeholder="Fallback Batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batchOptions.map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Live Verification Preview Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Step 2: Verify Mapped Data Preview (First 4 Rows)
              </h3>
              <div className="overflow-x-auto rounded-lg border border-border bg-background">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/40 font-mono text-[11px] text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-2">Email / Account</th>
                      <th className="p-2">Full Name</th>
                      <th className="p-2">Reg No.</th>
                      <th className="p-2">Year</th>
                      <th className="p-2">Batch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewRows.map((p, idx) => (
                      <tr key={idx} className="hover:bg-secondary/20">
                        <td className="p-2 font-mono text-[11px] text-primary">{p.email}</td>
                        <td className="p-2 font-medium">{p.name}</td>
                        <td className="p-2 text-muted-foreground">{p.regNo}</td>
                        <td className="p-2 text-muted-foreground">{p.year}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                            {p.batch}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetState();
              onOpenChange(false);
            }}
            disabled={busy}
          >
            Cancel
          </Button>
          {file ? (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => void handleImport()}
              disabled={busy || !emailCol}
            >
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing Members…
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" /> Verify & Import ({rawRows.length} Members)
                </>
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
